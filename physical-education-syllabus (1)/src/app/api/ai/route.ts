import { buildPrompt, parseQuestions, type AiRequest } from "@/lib/ai-shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Provider = "pollinations" | "glyph" | "llm7";

interface Cfg {
  label: string;
  url: string;
  model: string;
  headers?: Record<string, string>;
  timeout: number;
}

const PROVIDERS: Record<Provider, Cfg> = {
  pollinations: { label: "Pollinations AI", url: "https://text.pollinations.ai/openai", model: "openai-fast", timeout: 22000 },
  glyph: { label: "Glyph Cluster", url: "https://api.kilo.ai/api/gateway/chat/completions", model: "stealth/glyph-cluster", timeout: 26000 },
  llm7: { label: "LLM7", url: "https://api.llm7.io/v1/chat/completions", model: "default", headers: { Authorization: "Bearer unused" }, timeout: 22000 },
};

async function callProvider(p: Provider, prompt: string): Promise<string> {
  const cfg = PROVIDERS[p];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.timeout);
  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cfg.headers ?? {}) },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: "system", content: "You are a precise exam-question generator. Reply with a valid JSON array only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 4000,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`${cfg.label} responded with ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error(`${cfg.label} returned an empty reply`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  let body: Partial<AiRequest> & { provider?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const paper = body.paper === 2 ? 2 : 1;
  const units = Array.isArray(body.units) && body.units.length ? body.units.map(Number).filter((n) => n >= 1 && n <= 10) : [1];
  const request: AiRequest = {
    paper,
    units,
    count: Math.min(Math.max(Number(body.count) || 5, 1), 8),
    difficulty: (["easy", "medium", "hard", "mixed"] as const).includes(body.difficulty as never) ? (body.difficulty as AiRequest["difficulty"]) : "mixed",
    avoid: Array.isArray(body.avoid) ? body.avoid.map(String).slice(0, 30) : [],
  };
  const prompt = buildPrompt(request);
  const first = (["pollinations", "glyph", "llm7"] as Provider[]).includes(body.provider as Provider) ? (body.provider as Provider) : "pollinations";
  const order: Provider[] = [first, ...(["pollinations", "llm7", "glyph"] as Provider[]).filter((p) => p !== first)];
  const errors: string[] = [];
  for (const p of order) {
    try {
      const text = await callProvider(p, prompt);
      const questions = parseQuestions(text, request, PROVIDERS[p].label);
      if (questions.length) return Response.json({ ok: true, provider: PROVIDERS[p].label, questions, fellBack: p !== first });
      errors.push(`${PROVIDERS[p].label}: unreadable reply`);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "failed");
    }
  }
  return Response.json({ ok: false, error: errors.join(" · ") || "All AI sources failed" }, { status: 502 });
}
