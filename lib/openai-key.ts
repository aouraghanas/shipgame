/**
 * Returns a clean OpenAI API secret for Authorization: Bearer <secret>.
 * Common mistakes: JWT pasted instead of sk key, "Bearer " included in env, quotes/newlines.
 */
export function normalizeOpenAIApiKey(raw: string | undefined): string | null {
  if (!raw) return null;
  let k = raw
    .replace(/\u200b/g, "") // zero-width space
    .replace(/^\uFEFF/, "") // BOM
    .replace(/[\r\n]+/g, "") // multiline paste / Netlify line wrap in the secret
    .trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).trim();
  }
  if (k.toLowerCase().startsWith("bearer ")) {
    k = k.slice(7).trim();
  }
  return k.length ? k : null;
}

/** OpenAI API keys are opaque strings starting with sk- (incl. sk-proj-). JWTs start with eyJ and will fail with invalid_issuer. */
export function looksLikeJwtNotApiKey(key: string): boolean {
  return key.startsWith("eyJ");
}

export type ResolvedOpenAIKey =
  | { ok: true; key: string }
  | { ok: false; summary: string; recommendations: string };

/**
 * Use before calling api.openai.com. Surfaces common misconfigurations instead of opaque 401 invalid_issuer.
 */
export function resolveOpenAIApiKey(): ResolvedOpenAIKey {
  const key = normalizeOpenAIApiKey(process.env.OPENAI_API_KEY);
  if (!key) {
    return {
      ok: false,
      summary: "OPENAI_API_KEY is not set (or is only whitespace).",
      recommendations:
        "Add OPENAI_API_KEY in Netlify Site settings → Environment variables (and locally in .env). No quotes or Bearer prefix — paste only the secret from https://platform.openai.com/api-keys",
    };
  }
  if (looksLikeJwtNotApiKey(key)) {
    return {
      ok: false,
      summary:
        "OPENAI_API_KEY looks like a JWT (starts with eyJ), not an API secret. OpenAI returns HTTP 401 invalid_issuer for that.",
      recommendations:
        "Create a secret key at https://platform.openai.com/api-keys — it must start with sk- or sk-proj-. Do not use a browser session token or any other service’s JWT.",
    };
  }
  if (!key.startsWith("sk-")) {
    return {
      ok: false,
      summary: "OPENAI_API_KEY does not look like a Platform API secret.",
      recommendations:
        "Keys from https://platform.openai.com/api-keys start with sk- or sk-proj-. Remove accidental Bearer prefix, quotes, or newlines from the env value, then redeploy.",
    };
  }
  return { ok: true, key };
}

function trimIdEnv(raw: string | undefined): string | null {
  if (!raw) return null;
  const v = raw
    .replace(/\u200b/g, "")
    .replace(/^\uFEFF/, "")
    .replace(/[\r\n]+/g, "")
    .trim();
  if (!v) return null;
  const unquote =
    (v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))
      ? v.slice(1, -1).trim()
      : v;
  return unquote.length ? unquote : null;
}

/**
 * Headers for https://api.openai.com — includes optional org/project (needed for some multi-org
 * or project-scoped keys; see https://platform.openai.com/docs/api-reference/authentication ).
 */
export function getOpenAIRequestHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  const org = trimIdEnv(process.env.OPENAI_ORG_ID);
  const project = trimIdEnv(process.env.OPENAI_PROJECT_ID);
  if (org) headers["OpenAI-Organization"] = org;
  if (project) headers["OpenAI-Project"] = project;
  return headers;
}

/** Extra guidance when the API still returns 401 (e.g. invalid_issuer). */
export function augmentOpenAI401Body(bodyText: string): string {
  const base = bodyText.slice(0, 1200);
  if (!bodyText.includes("invalid_issuer") && !bodyText.includes("not from a valid issuer")) {
    return base;
  }
  return (
    base +
    "\n\n" +
    "Troubleshooting (invalid_issuer): (1) Create a new secret at https://platform.openai.com/api-keys — " +
    "it must be the API secret (sk-… or sk-proj-), not a ChatGPT session token. " +
    "(2) If you use a project key (sk-proj-), set Netlify env OPENAI_PROJECT_ID to the project id (proj_… from " +
    "the project’s General settings) and optional OPENAI_ORG_ID=org_… if you belong to multiple orgs, then redeploy. " +
    "(3) Ensure the key in Netlify has no line breaks or extra characters."
  );
}
