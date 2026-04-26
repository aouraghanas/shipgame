import type { FeedbackReportPeriod } from "@prisma/client";
import {
  augmentOpenAI401Body,
  getOpenAIRequestHeaders,
  resolveOpenAIApiKey,
  trimIdEnv,
} from "@/lib/openai-key";

type ActivityRow = {
  createdAt: Date;
  category: string;
  description: string;
  attachments: string[];
  manager: { name: string };
  seller: { name: string };
};

export async function analyzeActivitiesWithAI(input: {
  period: FeedbackReportPeriod;
  fromDate: Date;
  toDate: Date;
  scope: "GLOBAL" | "SELLER";
  sellerName?: string;
  activities: ActivityRow[];
}): Promise<{
  summary: string;
  recommendations: string;
  insights: unknown;
  model: string | null;
}> {
  const keyRes = resolveOpenAIApiKey();
  if (!keyRes.ok) {
    return {
      summary: keyRes.summary,
      recommendations: keyRes.recommendations,
      insights: { themes: [] },
      model: null,
    };
  }
  const apiKey = keyRes.key;

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const lines = input.activities.slice(0, 600).map((a) => ({
    date: a.createdAt.toISOString(),
    category: a.category,
    manager: a.manager.name,
    seller: a.seller.name,
    hasAttachments: a.attachments.length > 0,
    description: a.description,
  }));

  const scopeHint =
    input.scope === "GLOBAL"
      ? "All sellers and managers — focus on portfolio-level engagement patterns."
      : `Focus on seller "${input.sellerName ?? "unknown"}" only.`;

  const prompt = [
    "You are analyzing CRM activity logs (calls, emails, meetings, etc.) between account managers and sellers.",
    `Reporting window: ${input.period} from ${input.fromDate.toISOString()} to ${input.toDate.toISOString()}.`,
    scopeHint,
    "Return strict JSON with keys:",
    "{ summary: string, recommendations: string, insights: {",
    "  categoryMix: string,",
    "  busiestManagers: string,",
    "  sellerEngagement: string,",
    "  risksOrGaps: string,",
    "  repeatedThemes: [{ theme: string, count: number }]",
    "} }",
    "Requirements:",
    "- summary: executive narrative for leadership (coverage, intensity, notable patterns).",
    "- recommendations: concrete next steps for sales leadership / ops.",
    "- insights fields: short analytical paragraphs (2-4 sentences each) based on the data.",
    "- repeatedThemes: recurring topics across descriptions (estimate counts).",
    "Activities JSON:",
    JSON.stringify(lines),
  ].join("\n");

  const url = "https://api.openai.com/v1/chat/completions";
  const bodyStr = JSON.stringify({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You are a strict JSON generator." },
      { role: "user", content: prompt },
    ],
  });

  let response = await fetch(url, {
    method: "POST",
    headers: getOpenAIRequestHeaders(apiKey),
    body: bodyStr,
  });

  const scopedHeaders =
    Boolean(trimIdEnv(process.env.OPENAI_ORG_ID) || trimIdEnv(process.env.OPENAI_PROJECT_ID));

  if (!response.ok && response.status === 401 && scopedHeaders) {
    const firstErr = await response.text().catch(() => "unknown error");
    const retry = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: bodyStr,
    });
    if (retry.ok) {
      response = retry;
    } else {
      const secondErr = await retry.text().catch(() => "unknown error");
      return {
        summary: "AI generation failed: HTTP 401.",
        recommendations:
          augmentOpenAI401Body(firstErr) +
          `\n\nRetry without OpenAI-Organization / OpenAI-Project headers failed (HTTP ${retry.status}): ${secondErr.slice(0, 600)}`,
        insights: { error: true },
        model,
      };
    }
  }

  if (!response.ok) {
    const err = await response.text().catch(() => "unknown error");
    const recommendations =
      response.status === 401 ? augmentOpenAI401Body(err) : err.slice(0, 1200);
    return {
      summary: `AI generation failed: HTTP ${response.status}.`,
      recommendations,
      insights: { error: true },
      model,
    };
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(content) as {
      summary?: string;
      recommendations?: string;
      insights?: unknown;
    };
    return {
      summary: parsed.summary || "No summary generated.",
      recommendations: parsed.recommendations || "No recommendations generated.",
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
