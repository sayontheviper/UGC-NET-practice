"use client";

import { useEffect, useMemo, useState } from "react";
import type { Difficulty, Question } from "@/lib/types";
import { getPaper } from "@/lib/syllabus";
import { buildSession } from "@/lib/bank";
import { useApp } from "@/components/Providers";
import Quiz from "@/components/Quiz";
import { Dropdown, Field, PaperToggle, Pills } from "@/components/ui";

const KINDS_P2 = ["Direct MCQ", "Statement-based", "Match the following", "Assertion–Reason", "Sequencing", "Odd one out", "Numerical"];
const KINDS_P1 = ["Direct MCQ", "Statement-based", "Match the following", "Assertion–Reason", "Sequencing", "Series & codes", "Syllogism", "Data interpretation", "Comprehension"];

export default function PracticePage() {
  const { data } = useApp();
  const [paper, setPaper] = useState<1 | 2>(1);
  const [unit, setUnit] = useState<"all" | number>("all");
  const [count, setCount] = useState(20);
  const [diff, setDiff] = useState<Difficulty>("mixed");
  const [session, setSession] = useState<{ qs: Question[]; key: number; title: string } | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("paper");
    if (p === "2") setPaper(2);
  }, []);

  const info = getPaper(paper);
  const unitOptions = useMemo(
    () => [
      { value: "all" as const, label: "Mixed — questions from all units", sub: `Spread across all ${info.units.length} units of ${info.name}` },
      ...info.units.map((u) => ({ value: u.n as "all" | number, label: `Unit ${u.n} · ${u.name}`, sub: u.topics })),
    ],
    [info],
  );

  function start() {
    const qs = buildSession({ paper, units: unit === "all" ? [] : [unit], count, difficulty: diff, seen: new Set(data.seen) });
    const uName = unit === "all" ? "Mixed units" : `Unit ${unit}`;
    setSession({ qs, key: Date.now(), title: `${info.name} · ${uName} · ${diff[0].toUpperCase() + diff.slice(1)}` });
  }

  if (session)
    return (
      <Quiz
        key={session.key}
        questions={session.qs}
        title={session.title}
        mode="practice"
        paper={paper}
        onExit={() => setSession(null)}
        onRetry={(qs) => setSession({ qs, key: Date.now(), title: session.title + " (retry)" })}
      />
    );

  return (
    <div className="page">
      <h1 className="f-display text-4xl sm:text-5xl">Practice</h1>
      <p className="f-small t-muted mt-2 max-w-2xl">
        Pick a paper, a unit (or mix them all), the number of questions and the difficulty. Hints are available during practice; full explanations and flashcards unlock when the session ends.
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
          <Field label="2 · Unit" hint="Choose one unit or mix them all">
            <Dropdown value={unit} onChange={setUnit} options={unitOptions} />
          </Field>
          <Field label="3 · Number of questions">
            <Pills value={count} onChange={setCount} options={[10, 20, 30, 50, 100].map((n) => ({ value: n, label: String(n) }))} />
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
          <div className="flex flex-wrap items-center gap-4">
            <button className="btn btn-mint !px-8 !py-3.5 text-base" onClick={start}>
              Start practice →
            </button>
            <span className="f-small t-muted text-sm">Unseen questions are served first; you will only see repeats once the bank runs out.</span>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="glass-card p-6">
            <div className="f-display text-xl">Question types you will meet</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(paper === 2 ? KINDS_P2 : KINDS_P1).map((k) => (
                <span key={k} className="f-small rounded-full border border-white/12 bg-black/20 px-3 py-1 text-xs">
                  {k}
                </span>
              ))}
            </div>
            <p className="f-small t-muted mt-3 text-sm">
              {paper === 1
                ? "Math, Logic and Data Interpretation units use their own formats (series, codes, syllogisms, charts) instead of match / sequence / statement items."
                : "Statement, match, sequencing and assertion–reason items are built from curated facts, so every wrong option is a genuine near-miss."}
            </p>
          </div>
          <div className="glass-card p-6">
            <div className="f-display text-xl">Deep bank</div>
            <p className="f-small t-muted mt-2 text-sm">
              Every unit holds <b className="f-medium">2,500+ distinct questions</b> assembled from a curated fact base, so sessions rarely repeat. Questions you have already practised are tracked{" "}
              {data.seen.length ? `(${data.seen.length} so far)` : ""} and skipped first.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
