import type { Difficulty, Question } from "@/lib/types";
import { getPaper } from "@/lib/syllabus";
import { hashStr } from "@/lib/bank/engine";

export interface AiRequest {
  paper: 1 | 2;
  units: number[];
  count: number;
  difficulty: Difficulty;
  avoid?: string[];
}

const DIFF_TEXT: Record<Difficulty, string> = {
  easy: "EASY: direct recall of standard facts and definitions; one clearly best option and plausible distractors.",
  medium: "MEDIUM: application and understanding; statement-based, matching, assertion-reason; distractors that are close to the truth.",
  hard: "HARD: analytical, multi-statement, sequencing and assertion-reason items; every distractor must be a very plausible near-miss.",
  mixed: "MIXED: roughly 30% easy, 40% medium, 30% hard.",
};

export function buildPrompt(req: AiRequest): string {
  const p = getPaper(req.paper);
  const units = req.units.map((n) => p.units.find((u) => u.n === n)).filter(Boolean) as { n: number; name: string; topics: string }[];
  const unitLines = units.map((u) => `- Unit ${u.n}: ${u.name} (${u.topics})`).join("\n");
  const types =
    req.paper === 2
      ? "Use a mix of UGC NET Physical Education (Code 47) question types: direct MCQ, statement-based (Statement I / II / III with options such as 'Both I and II are correct'), match the following (List I / List II, options as letter-number combinations like 'A-2, B-1, C-4, D-3'), arrange in sequence/chronological order, and assertion-reason (options: both true & R explains A / both true but R does not explain A / A true R false / A false R true)."
      : "Follow the UGC NET Paper 1 pattern. For Teaching/Research/Communication/ICT/Environment/Higher-Education units use direct MCQ, statement-based, match-the-following, sequencing and assertion-reason. For Mathematical Reasoning, Logical Reasoning and Data Interpretation units DO NOT use matching, sequencing or statement-lists: use numerical problems, number/letter series, coding-decoding, blood relations, syllogisms, analogies, Venn diagrams, fallacies, Indian logic (pramanas, hetvabhasa), or data-interpretation questions with a small data table written as plain text inside the stem. For Comprehension include a short passage (60-90 words) in the 'passage' field.";
  const avoid = (req.avoid ?? []).slice(0, 25).map((s) => `- ${s.slice(0, 110)}`).join("\n");
  return `You are an expert UGC NET question setter. Create ${req.count} NEW, factually correct multiple-choice questions for UGC NET ${p.name} (${p.code}).

Units to cover (spread the questions across them):
${unitLines}

${types}

Difficulty: ${DIFF_TEXT[req.difficulty]}

Strict quality rules:
1. Every question has exactly 4 options and exactly ONE correct answer.
2. All wrong options must be meaningful, plausible and from the same category as the answer. Never use silly or obviously wrong options, and never include the answer inside the question text.
3. Statements and options must make sense and be factually correct per standard textbooks.
4. Do not repeat or paraphrase each other. Vary the question types.
5. Provide a one-line "hint" that nudges without revealing the answer, and a clear "explanation" of why the answer is right and the others wrong.
${avoid ? `6. Do NOT repeat these earlier questions:\n${avoid}\n` : ""}
Return ONLY a JSON array (no markdown, no commentary). Each item:
{"unit": <unit number>, "kind": "<question type>", "passage": "<optional>", "stem": "<question text>", "lines": ["<optional statements / assertion / reason / list items>"], "options": ["A text","B text","C text","D text"], "answer": <0-3 index of the correct option>, "hint": "<hint>", "explanation": "<explanation>"}`;
}

function extractJson(text: string): unknown[] {
  let t = text.trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const s = t.indexOf("[");
  const e = t.lastIndexOf("]");
  if (s < 0 || e <= s) return [];
  const body = t.slice(s, e + 1);
  try {
    const parsed = JSON.parse(body);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // salvage individual objects
    const out: unknown[] = [];
    const re = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
    const m = body.match(re) ?? [];
    for (const piece of m) {
      try {
        out.push(JSON.parse(piece));
      } catch {
        /* skip */
      }
    }
    return out;
  }
}

const isStr = (x: unknown): x is string => typeof x === "string" && x.trim().length > 0;

export function parseQuestions(text: string, req: AiRequest, source: string): Question[] {
  const raw = extractJson(text);
  const res: Question[] = [];
  const diff = req.difficulty === "easy" ? 1 : req.difficulty === "hard" ? 3 : 2;
  raw.forEach((it, i) => {
    const o = it as Record<string, unknown>;
    if (!o || !isStr(o.stem) || !Array.isArray(o.options)) return;
    let options = (o.options as unknown[]).filter(isStr).map((x) => x.trim().replace(/^\(?[A-Da-d][).:]\s+/, ""));
    if (options.length !== 4 || new Set(options.map((x) => x.toLowerCase())).size !== 4) return;
    let answer = Number(o.answer);
    if (!Number.isInteger(answer) || answer < 0 || answer > 3) return;
    const stem = String(o.stem).trim();
    if (stem.toLowerCase().includes(options[answer].toLowerCase()) && options[answer].length > 4) return;
    const isAR = options.some((x) => /both a and r/i.test(x));
    const isCombo = options.some((x) => /^(only|both|neither|all|i and|ii and|a-)/i.test(x));
    if (!isAR && !isCombo) {
      const correct = options[answer];
      const shuffled = options.slice().sort(() => Math.random() - 0.5);
      options = shuffled;
      answer = shuffled.indexOf(correct);
    }
    const unit = req.units.includes(Number(o.unit)) ? Number(o.unit) : req.units[i % req.units.length];
    const lines = Array.isArray(o.lines) ? (o.lines as unknown[]).filter(isStr).map((x) => x.trim()) : undefined;
    res.push({
      id: `ai-${Date.now().toString(36)}-${i}-${Math.floor(Math.random() * 1e4)}`,
      paper: req.paper,
      unit,
      kind: isStr(o.kind) ? o.kind.trim().slice(0, 60) : "AI question",
      topic: `Unit ${unit}`,
      difficulty: diff as 1 | 2 | 3,
      passage: isStr(o.passage) ? o.passage.trim() : undefined,
      stem,
      lines: lines && lines.length ? lines : undefined,
      options,
      answer,
      hint: [isStr(o.hint) ? o.hint.trim() : "Think about the core concept behind this question."],
      explanation: isStr(o.explanation) ? o.explanation.trim() : `The correct answer is: ${options[answer]}.`,
      key: String(hashStr(`ai:${stem}:${lines?.join("|") ?? ""}:${options[answer]}`)),
      source,
    });
  });
  return res;
}
