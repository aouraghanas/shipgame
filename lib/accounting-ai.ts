import {
  resolveOpenAIApiKey,
  getOpenAIRequestHeaders,
  augmentOpenAI401Body,
  trimIdEnv,
} from "@/lib/openai-key";

export async function analyzeAccountingWithAI(input: {
  fromIso: string;
  toIso: string;
  summaryJson: string;
}): Promise<{ summary: string; recommendations: string; insights: unknown; model: string | null }> {
  const keyRes = resolveOpenAIApiKey();
  if (!keyRes.ok) {
    return {
      summary: keyRes.summary,
      recommendations: keyRes.recommendations,
      insights: {},
      model: null,
    };
  }
  const apiKey = keyRes.key;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const prompt = [
    "You are the CFO-style analyst for Shipeh, a Libya-based logistics and COD marketplace.",
    "Business: sellers source products or use catalog (COD Drop); Shipeh warehouses, confirms leads, ships COD, collects cash, pays Dexpress, keeps fees, remits sellers in LYD or USD.",
    `Reporting window: ${input.fromIso} to ${input.toIso}.`,
    "Here is JSON with category totals by currency and direction (EXPENSE vs REVENUE), plus per-currency net:",
    input.summaryJson,
    "Return strict JSON with keys:",
    "{ summary: string, recommendations: string, insights: {",
    "  costPressure: string,",
    "  revenueDrivers: string,",
    "  fxAndTransferRisk: string,",
    "  operationalLeaks: string,",
    "  nextActions: string",
    "} }",
    "Be concrete (reference categories and currencies). Use short paragraphs.",
  ].join("\n");

  const url = "https://api.openai.com/v1/chat/completions";
  const bodyStr = JSON.stringify({
    model,
    temperature: 0.25,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You are a strict JSON generator for finance summaries." },
      { role: "user", content: prompt },
    ],
  });

  let response = await fetch(url, {
    method: "POST",
    headers: getOpenAIRequestHeaders(apiKey),
    body: bodyStr,
  });

  const scoped = Boolean(trimIdEnv(process.env.OPENAI_ORG_ID) || trimIdEnv(process.env.OPENAI_PROJECT_ID));
  if (!response.ok && response.status === 401 && scoped) {
    const err = await response.text().catch(() => "");
    const retry = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: bodyStr,
    });
    if (retry.ok) response = retry;
    else {
      const err2 = await retry.text().catch(() => "");
      return {
        summary: "AI generation failed: HTTP 401.",
        recommendations: augmentOpenAI401Body(err) + `\n\nRetry: ${err2.slice(0, 400)}`,
        insights: { error: true },
        model,
      };
    }
  }

  if (!response.ok) {
    const err = await response.text().catch(() => "unknown");
    return {
      summary: `AI generation failed: HTTP ${response.status}.`,
      recommendations: response.status === 401 ? augmentOpenAI401Body(err) : err.slice(0, 1200),
      insights: { error: true },
      model,
    };
  }

  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(content) as {
      summary?: string;
      recommendations?: string;
      insights?: unknown;
    };
    return {
      summary: parsed.summary || "No summary.",
      recommendations: parsed.recommendations || "No recommendations.",
      insights: parsed.insights ?? {},
      model,
    };
  } catch {
    return {
      summary: "AI returned invalid JSON.",
      recommendations: content.slice(0, 2000),
      insights: {},
      model,
    };
  }
}
