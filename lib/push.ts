/**
 * Expo push notifications.
 *
 * We store one `PushDevice` row per registered Expo push token. To deliver a
 * notification we POST batches to Expo's push service. This module is designed
 * to be fire-and-forget: a push failure must never break the in-app flow that
 * triggered it (ticket create, campaign send, …). Callers wrap in try/catch or
 * use `void`.
 *
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

import { prisma } from "@/lib/prisma";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
// Expo recommends batches of <= 100 messages per request.
const BATCH_SIZE = 100;

export type PushMessage = {
  title: string;
  body?: string | null;
  /** Arbitrary data delivered to the app (e.g. a deep link). */
  data?: Record<string, unknown>;
};

type ExpoMessage = {
  to: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  sound: "default";
  priority: "high";
  channelId: "default";
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const EXPO_TOKEN_RE = /^ExponentPushToken\[.+\]$|^ExpoPushToken\[.+\]$/;

/** Validate an Expo push token shape before we store / send. */
export function isExpoPushToken(token: string): boolean {
  return EXPO_TOKEN_RE.test(token.trim());
}

/**
 * Send a push to every enabled device of the given users.
 *
 * Returns the number of device messages accepted by Expo (best-effort).
 * Tokens Expo reports as `DeviceNotRegistered` are disabled so we stop
 * targeting dead installs.
 */
export async function sendPushToUsers(
  userIds: string[],
  message: PushMessage
): Promise<number> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return 0;

  const devices = await prisma.pushDevice.findMany({
    where: { userId: { in: ids }, enabled: true },
    select: { token: true },
  });
  const tokens = devices.map((d) => d.token).filter(isExpoPushToken);
  return sendPushToTokens(tokens, message);
}

/** Send a push to an explicit list of Expo tokens. */
export async function sendPushToTokens(
  tokens: string[],
  message: PushMessage
): Promise<number> {
  const unique = Array.from(new Set(tokens.filter(isExpoPushToken)));
  if (unique.length === 0) return 0;

  let accepted = 0;
  for (const batch of chunk(unique, BATCH_SIZE)) {
    const messages: ExpoMessage[] = batch.map((to) => ({
      to,
      title: message.title,
      body: message.body ?? undefined,
      data: message.data,
      sound: "default",
      priority: "high",
      channelId: "default",
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });
      if (!res.ok) {
        console.error("[push] Expo responded non-OK", res.status);
        continue;
      }
      const json = (await res.json()) as {
        data?: { status: string; message?: string; details?: { error?: string } }[];
      };
      const tickets = json.data ?? [];
      const deadTokens: string[] = [];
      tickets.forEach((ticket, i) => {
        if (ticket.status === "ok") {
          accepted += 1;
        } else if (ticket.details?.error === "DeviceNotRegistered") {
          deadTokens.push(batch[i]);
        }
      });
      if (deadTokens.length) {
        await prisma.pushDevice
          .updateMany({
            where: { token: { in: deadTokens } },
            data: { enabled: false },
          })
          .catch(() => {});
      }
    } catch (e) {
      console.error("[push] send failed", e instanceof Error ? e.message : e);
    }
  }
  return accepted;
}
