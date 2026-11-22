"use client";

import { useEffect, useMemo, useState } from "react";
import type { Difficulty, Question } from "@/lib/types";
import { getPaper } from "@/lib/syllabus";
import { buildSession } from "@/lib/bank";
import { buildPrompt, parseQuestions } from "@/lib/ai-shared";
import { useApp } from "@/components/Providers";
import Quiz from "@/components/Quiz";
import { Dropdown, Field, PaperToggle, Pills } from "@/components/ui";

type Source = "auto" | "glyph" | "llm7" | "puter" | "bank";

const SOURCES: { value: Source; label: string; sub: string }[] = [
  { value: "auto", label: "Auto — Pollinations AI (fastest)", sub: "Free, no key. Falls back to other free AIs automatically" },
  { value: "glyph", label: "Glyph Cluster", sub: "Free reasoning model, no key (called through the site’s server)" },
  { value: "llm7", label: "LLM7", sub: "Free, no key" },
  { value: "puter", label: "Puter AI", sub: "Free, runs from your browser via Puter.js" },
  { value: "bank", label: "Built-in generator (instant)", sub: "No internet AI needed — draws on the 2,500-per-unit bank" },
];

interface PuterGlobal {
  ai: { chat: (prompt: string, opts?: Record<string, unknown>) => Promise<unknown> };
}

function loadPuter(): Promise<PuterGlobal> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { puter?: PuterGlobal };
    if (w.puter) return resolve(w.puter);
    const s = document.createElement("script");
    s.src = "https://js.puter.com/v2/";
    s.onload = () => (w.puter ? resolve(w.puter) : reject(new Error("Puter failed to load")));
    s.onerror = () => reject(new Error("Could not load Puter.js"));
    document.head.appendChild(s);
  });
}

function toText(resp: unknown): string {
  if (typeof resp === "string") return resp;
  const r = resp as { message?: { content?: unknown }; text?: string } | null;
  const c = r?.message?.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((p) => (typeof p === "string" ? p : ((p as { text?: string }).text ?? ""))).join("");
  return r?.text ?? "";
}

const STEM_KEY = "sayon_ai_stems_v1";

export default function AiPage() {
  const { data } = useApp();
  const [paper, setPaper] = useState<1 | 2>(2);
  const [unit, setUnit] = useState<"all" | number>("all");
  const [count, setCount] = useState(10);
  const [diff, setDiff] = useState<Difficulty>("mixed");
  const [source, setSource] = useState<Source>("auto");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [note, setNote] = useState<{ kind: "ok" | "warn"; text: string } | null>(null);
  const [session, setSession] = useState<{ qs: Question[]; key: number; title: string } | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("paper");
    if (p === "1") setPaper(1);
  }, []);

  const info = getPaper(paper);
  const unitOptions = useMemo(
    () => [
      { value: "all" as const, label: "Mixed — questions from all units", sub: "Each batch mixes different units of the paper" },
      ...info.units.map((u) => ({ value: u.n as "all" | number, label: `Unit ${u.n} · ${u.name}`, sub: u.topics })),
    ],
    [info],
  );

  async function generate() {
    setBusy(true);
    setNote(null);
    const allUnits = info.units.map((u) => u.n);
    const pool = unit === "all" ? allUnits : [unit];
    const chunkSize = 5;
    const chunks = Math.ceil(count / chunkSize);
    let avoid: string[] = [];
    try {
      avoid = JSON.parse(localStorage.getItem(STEM_KEY) ?? "[]");
    } catch {
      avoid = [];
    }
    const pickUnits = (c: number) => (unit === "all" ? [pool[(c * 2) % pool.length], pool[(c * 2 + 1 + Math.floor(c / 5)) % pool.length]].filter((v, i, a) => a.indexOf(v) === i) : pool);
    let got: Question[] = [];
    let usedLabel = "";
    let fell = "";

    try {
      if (source !== "bank") {
        let done = 0;
        const run = async (c: number) => {
          const req = { paper, units: pickUnits(c), count: Math.min(chunkSize, count - c * chunkSize), difficulty: diff, avoid };
          if (source === "puter") {
            const puter = await loadPuter();
            const resp = await puter.ai.chat(buildPrompt(req), { model: "gpt-4o-mini" });
            const qs = parseQuestions(toText(resp), req, "Puter AI");
            if (!qs.length) throw new Error("Puter returned no usable questions");
            usedLabel = "Puter AI";
            return qs;
          }
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 40000);
          try {
            const res = await fetch("/api/ai", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...req, provider: source === "auto" ? "pollinations" : source }),
              signal: ctrl.signal,
            });
            const j = (await res.json()) as { ok: boolean; questions?: Question[]; provider?: string; error?: string; fellBack?: boolean };
            if (!j.ok || !j.questions?.length) throw new Error(j.error ?? "AI returned nothing");
            usedLabel = j.provider ?? usedLabel;
            if (j.fellBack) fell = ` (${j.provider} answered because the first choice was busy)`;
            return j.questions;
          } finally {
            clearTimeout(t);
          }
        };
        const tasks = Array.from({ length: chunks }, (_, c) =>
          run(c)
            .then((qs) => {
              done++;
              setProgress(`Generated ${done} of ${chunks} batches…`);
              return qs;
            })
            .catch((e: Error) => {
              done++;
              setProgress(`Generated ${done} of ${chunks} batches…`);
              fell = fell || ` (${e.message})`;
              return [] as Question[];
            }),
        );
        setProgress(`Asking ${source === "puter" ? "Puter AI" : "the AI"} for ${count} questions in ${chunks} parallel batches…`);
        if (source === "puter") {
          for (const t of tasks) got = got.concat(await t);
        } else got = (await Promise.all(tasks)).flat();
      }

      // de-duplicate inside this batch only
      const seen = new Set<string>();
      got = got.filter((q) => (seen.has(q.key) ? false : (seen.add(q.key), true)));
      let filled = 0;
      if (got.length < count) {
        const extra = buildSession({ paper, units: unit === "all" ? [] : [unit], count: count - got.length + 4, difficulty: diff, seen: new Set(data.seen) }).filter((q) => !seen.has(q.key));
        const take = extra.slice(0, count - got.length);
        filled = take.length;
        got = [...got, ...take.map((q) => ({ ...q, source: "Built-in generator" }))];
      }
      got = got.slice(0, count);
      if (!got.length) throw new Error("No questions could be generated");

      try {
        const stems = got.filter((q) => q.id.startsWith("ai-")).map((q) => q.stem.slice(0, 120));
        localStorage.setItem(STEM_KEY, JSON.stringify([...stems, ...avoid].slice(0, 30)));
      } catch {
        /* ignore */
      }
      if (source === "bank") setNote({ kind: "ok", text: "Questions drawn from the built-in bank." });
      else if (filled === got.length) setNote({ kind: "warn", text: `The AI sources were unreachable${fell}, so the built-in generator supplied all ${filled} questions.` });
      else setNote({ kind: "ok", text: `${got.length - filled} questions generated by ${usedLabel || "AI"}${filled ? `; ${filled} filled from the built-in bank` : ""}.${fell}` });

      const uName = unit === "all" ? "Mixed units" : `Unit ${unit}`;
      setSession({ qs: got, key: Date.now(), title: `AI · ${info.name} · ${uName} · ${diff}` });
    } catch (e) {
      setNote({ kind: "warn", text: e instanceof Error ? e.message : "Generation failed" });
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  if (session)
    return (
      <Quiz
        key={session.key}
        questions={session.qs}
        title={session.title}
        mode="ai"
        paper={paper}
        onExit={() => setSession(null)}
        onRetry={(qs) => setSession({ qs, key: Date.now(), title: session.title + " (retry)" })}
      />
    );

  return (
    <div className="page">
      <h1 className="f-display text-4xl sm:text-5xl">AI Question Generator</h1>
      <p className="f-small t-muted mt-2 max-w-3xl">
        Generate fresh questions in the UGC NET pattern using free AI models — <b className="f-medium">no API key needed</b>. Questions are requested in small parallel batches for speed, validated, and every session
        also gets hints, explanations and flashcards.
      </p>

      <div className="mt-8 grid gap-6">
        <Field label="1 · Paper">
          <PaperToggle
            value={paper}
            onChange={(p) => {
              setPaper(p);
              setUnit("all");
            }}
          />
        </Field>
        <div className="glass-card relative z-20 grid gap-6 p-6">
          <Field label="2 · Unit">
            <Dropdown value={unit} onChange={setUnit} options={unitOptions} />
          </Field>
          <Field label="3 · Number of questions">
            <Pills value={count} onChange={setCount} options={[5, 10, 15, 20, 30].map((n) => ({ value: n, label: String(n) }))} />
          </Field>
          <Field label="4 · Difficulty">
            <Pills
              value={diff}
              onChange={setDiff}
              options={[
                { value: "easy", label: "Easy" },
                { value: "medium", label: "Medium" },
                { value: "hard", label: "Hard" },
                { value: "mixed", label: "Mixed" },
              ]}
            />
          </Field>
          <Field label="5 · AI source" hint="All free · no keys">
            <Dropdown value={source} onChange={setSource} options={SOURCES} />
          </Field>
          <div className="flex flex-wrap items-center gap-4">
            <button className="btn btn-mint !px-8 !py-3.5 text-base" onClick={generate} disabled={busy}>
              {busy ? (
                <>
                  <span className="spinner" /> Generating…
                </>
              ) : (
                "Generate questions ✨"
              )}
            </button>
            {busy && <span className="f-small t-muted text-sm">{progress}</span>}
          </div>
          {note && (
            <div className={`rise f-small rounded-2xl border px-4 py-3 text-sm ${note.kind === "ok" ? "border-[var(--mint)]/40 bg-[var(--mint-soft)]" : "border-[var(--red)]/40 bg-[var(--red)]/10 text-[#f3b0aa]"}`}>{note.text}</div>
          )}
        </div>

        <div className="glass-card p-6">
          <div className="f-display text-xl">How it works</div>
          <ul className="f-small t-muted mt-2 grid gap-1.5 text-sm">
            <li>• Glyph Cluster, Pollinations and LLM7 are called through this site’s server, so browser restrictions (CORS) never block them.</li>
            <li>• Puter AI runs directly in your browser through Puter.js and may ask you to sign in to Puter once.</li>
            <li>• If a source is busy, the next free source is tried automatically; any shortfall is filled from the built-in bank so a session always starts.</li>
            <li>• Recently generated stems are sent back to the AI as “do not repeat”, and duplicates within a batch are removed.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
