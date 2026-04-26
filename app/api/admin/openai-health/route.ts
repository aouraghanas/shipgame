import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  augmentOpenAI401Body,
  getOpenAIAuthHeaders,
  openAIEnvDiagnostics,
  resolveOpenAIApiKey,
} from "@/lib/openai-key";

export const runtime = "nodejs";

async function probeModels(label: string, headers: Record<string, string>) {
  const t0 = Date.now();
  const res = await fetch("https://api.openai.com/v1/models?limit=1", {
    method: "GET",
    headers,
    cache: "no-store",
  });
  const ms = Date.now() - t0;
  const text = await res.text();
  const reqId = res.headers.get("x-request-id");
  let snippet = text.slice(0, 400);
  try {
    const j = JSON.parse(text) as { error?: unknown };
    if (j?.error) snippet = JSON.stringify(j.error);
  } catch {
    /* keep raw snippet */
  }
  return {
    label,
    status: res.status,
    ok: res.ok,
    ms,
    xRequestId: reqId,
    errorSnippet: res.ok ? null : snippet,
  };
}

/**
 * Admin-only: verifies what the *server* sees for OpenAI env and hits a tiny OpenAI endpoint.
 * Does not return secrets — only masked prefixes and HTTP outcomes.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const env = openAIEnvDiagnostics();
  const keyRes = resolveOpenAIApiKey();
  if (!keyRes.ok) {
    return NextResponse.json({
      ok: false,
      reason: "invalid_env",
      env,
      resolveError: { summary: keyRes.summary, recommendations: keyRes.recommendations },
      probes: [] as const,
      hint: keyRes.recommendations,
    });
  }

  const apiKey = keyRes.key;
  const withScopes = getOpenAIAuthHeaders(apiKey);
  const bearerOnly: Record<string, string> = { Authorization: `Bearer ${apiKey}` };

  const probeFull = await probeModels("GET /v1/models (Bearer + optional org/project headers)", withScopes);
  const probeBare = await probeModels("GET /v1/models (Bearer only)", bearerOnly);

  const overallOk = probeFull.ok || probeBare.ok;

  let hint: string | null = null;
  if (!probeFull.ok && probeBare.ok) {
    hint =
      "OpenAI accepted the key with Bearer-only but rejected the request when org/project headers were added. Remove OPENAI_ORG_ID and OPENAI_PROJECT_ID in Netlify (or fix them to match the key’s org/project), redeploy, and try again.";
  } else if (!probeFull.ok && !probeBare.ok && probeFull.status === 401) {
    const combined = `${probeFull.errorSnippet ?? ""}\n${probeBare.errorSnippet ?? ""}`;
    hint = augmentOpenAI401Body(combined);
  } else if (!probeFull.ok && !probeBare.ok) {
    hint =
      (probeFull.errorSnippet ?? "unknown") +
      (probeBare.errorSnippet && probeBare.errorSnippet !== probeFull.errorSnippet
        ? ` | bare: ${probeBare.errorSnippet}`
        : "");
  }

  return NextResponse.json({
    ok: overallOk,
    env,
    probes: [probeFull, probeBare],
    hint,
  });
}
