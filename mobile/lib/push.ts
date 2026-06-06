/**
 * Mobile push registration.
 *
 * After login (and on app open while authenticated) we ask for notification
 * permission, fetch the Expo push token, and register it with the backend at
 * /api/me/push-devices so server-side events can reach this device.
 *
 * All functions are best-effort: failures are logged in dev and swallowed so
 * the app keeps working without push.
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { api } from "./api";

function projectId(): string | undefined {
  return (
    (Constants?.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
      ?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } })?.easConfig?.projectId
  );
}

/**
 * Request permission + fetch the Expo push token, then POST it to the backend.
 * Returns the token on success, or null if unavailable/denied.
 */
export async function registerPushToken(): Promise<string | null> {
  try {
    // Push tokens only work on physical devices, not simulators.
    if (!Device.isDevice) return null;

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return null;

    const pid = projectId();
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      pid ? { projectId: pid } : undefined
    );
    const token = tokenResp.data;
    if (!token) return null;

    await api("/api/me/push-devices", {
      method: "POST",
      body: {
        token,
        platform: Platform.OS,
        deviceName: Device.deviceName ?? undefined,
      },
    });
    return token;
  } catch (e) {
    if (__DEV__) console.log("[push] register failed", e);
    return null;
  }
}

/** Unregister this device's token (best-effort), e.g. on logout. */
export async function unregisterPushToken(): Promise<void> {
  try {
    if (!Device.isDevice) return;
    const pid = projectId();
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      pid ? { projectId: pid } : undefined
    );
    const token = tokenResp.data;
    if (!token) return;
    await api(`/api/me/push-devices?token=${encodeURIComponent(token)}`, {
      method: "DELETE",
    });
  } catch (e) {
    if (__DEV__) console.log("[push] unregister failed", e);
  }
}
