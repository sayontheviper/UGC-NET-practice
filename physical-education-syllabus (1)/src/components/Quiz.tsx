"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Question } from "@/lib/types";
import { useApp } from "@/components/Providers";
import { QuestionBody } from "@/components/Visuals";
import { Confetti } from "@/components/ui";
import FlashStack from "@/components/Flashcards";
import { getUnit } from "@/lib/syllabus";

interface Props {
  questions: Question[];
  title: string;
  mode: "practice" | "pyq" | "ai";
  paper: 1 | 2;
  onExit: () => void;
  onRetry: (qs: Question[]) => void;
}

const L = "ABCD";

function Review({ q, picked, index, hints }: { q: Question; picked: number | null; index: number; hints: number }) {
  const ok = picked === q.answer;
  return (
    <div className="glass-card p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="f-medium rounded-full bg-black/25 px-3 py-1">Q{index + 1}</span>
        <span className="f-medium t-mint">{q.kind}</span>
        <span className="f-small t-muted">· {q.topic}</span>
        <span className={`f-medium ml-auto rounded-full px-3 py-1 ${picked === null ? "bg-white/10" : ok ? "bg-[var(--green)]/20 text-[var(--green)]" : "bg-[var(--red)]/20 text-[#f3a8a2]"}`}>
          {picked === null ? "Skipped" : ok ? "Correct" : "Wrong"}
        </span>
        {hints > 0 && <span className="f-small t-muted">· {hints} hint{hints > 1 ? "s" : ""} used</span>}
      </div>
      <QuestionBody q={q} />
      <div className="mt-4 grid gap-2">
        {q.options.map((o, i) => {
          const cls = i === q.answer ? "correct" : i === picked ? "wrong" : "";
          return (
            <div key={i} className={`opt !cursor-default !animate-none ${cls}`} style={{ animation: "none" }}>
              <span className="letter">{L[i]}</span>
              <span className="f-small pt-0.5 text-[0.95rem]">{o}</span>
              {i === q.answer && <span className="f-medium ml-auto text-xs text-[var(--green)]">✓ Correct answer</span>}
              {i === picked && i !== q.answer && <span className="f-medium ml-auto text-xs text-[#f3a8a2]">Your answer</span>}
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-2xl border border-[var(--mint)]/25 bg-[var(--mint-soft)] p-4">
        <div className="f-medium t-mint mb-1 text-xs uppercase tracking-wider">Explanation</div>
        <p className="f-small text-[0.95rem] leading-relaxed">{q.explanation}</p>
      </div>
    </div>
  );
}

export default function Quiz({ questions, title, mode, paper, onExit, onRetry }: Props) {
  const { finishSession } = useApp();
  const n = questions.length;
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(n).fill(null));
  const [answered, setAnswered] = useState<boolean[]>(() => Array(n).fill(false));
  const [hints, setHints] = useState<number[]>(() => Array(n).fill(0));
  const [struck, setStruck] = useState<number[][]>(() => Array.from({ length: n }, () => []));
  const [phase, setPhase] = useState<"run" | "result">("run");
  const [tab, setTab] = useState<"wrong" | "all" | "cards">("wrong");
  const [confetti, setConfetti] = useState(0);
  const [secs, setSecs] = useState(0);
  const saved = useRef(false);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== "run") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [idx, phase]);

  const q = questions[idx];
  const picked = answers[idx];
  const isDone = answered[idx];
  const score = useMemo(() => questions.reduce((s, qq, i) => s + (answers[i] === qq.answer ? 1 : 0), 0), [questions, answers]);

  function choose(i: number) {
    if (isDone) return;
    setAnswers((a) => a.map((v, k) => (k === idx ? i : v)));
    setAnswered((a) => a.map((v, k) => (k === idx ? true : v)));
    if (i === q.answer) setConfetti((c) => c + 1);
  }

  function takeHint() {
    if (isDone) return;
    const level = hints[idx];
    if (level >= 2) return;
    if (level === 1) {
      const pool = q.options.map((_, i) => i).filter((i) => i !== q.answer && !struck[idx].includes(i));
      if (pool.length) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        setStruck((s) => s.map((arr, k) => (k === idx ? [...arr, pick] : arr)));
      }
    }
    setHints((h) => h.map((v, k) => (k === idx ? v + 1 : v)));
  }

  function next() {
    if (idx < n - 1) setIdx(idx + 1);
    else finish();
  }
  function finish() {
    if (!saved.current) {
      saved.current = true;
      finishSession({ title, mode, paper, questions, answers });
    }
    setPhase("result");
    setTab(questions.some((qq, i) => answers[i] !== qq.answer) ? "wrong" : "all");
  }

  const wrongQs = questions.map((qq, i) => ({ qq, i })).filter(({ qq, i }) => answers[i] !== qq.answer);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  /* ------------------------------ RESULT ------------------------------ */
  if (phase === "result") {
    const pct = Math.round((score / n) * 100);
    const skipped = answers.filter((a) => a === null).length;
    const wrongCount = wrongQs.length - skipped;
    const hintsUsed = hints.reduce((s, h) => s + h, 0);
    const off = 340 - (340 * pct) / 100;
    const msg = pct >= 80 ? "Outstanding work!" : pct >= 60 ? "Good job — keep polishing." : pct >= 40 ? "Getting there. Review and retry." : "Every expert started here. Revisit the explanations.";
    return (
      <div className="page" ref={top}>
        <div className="glass-card no-pop mb-6 grid items-center gap-6 p-6 sm:grid-cols-[auto_1fr]">
          <div className="relative mx-auto h-36 w-36">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="9" />
              <circle cx="60" cy="60" r="54" fill="none" stroke="var(--mint)" strokeWidth="9" strokeLinecap="round" className="ring-anim" style={{ ["--off" as string]: off }} />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <div className="f-display text-4xl">{pct}%</div>
                <div className="f-small t-muted text-xs">
                  {score}/{n}
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="f-small t-muted text-xs uppercase tracking-wider">{title}</div>
            <h2 className="f-display mt-1 text-3xl">{msg}</h2>
            <div className="f-small mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                ["Correct", score, "text-[var(--green)]"],
                ["Wrong", wrongCount, "text-[#f3a8a2]"],
                ["Skipped", skipped, ""],
                ["Hints used", hintsUsed, "t-mint"],
              ].map(([l, v, c]) => (
                <div key={String(l)} className="rounded-2xl bg-black/20 px-4 py-3">
                  <div className={`f-display text-2xl ${c}`}>{v}</div>
                  <div className="t-muted text-xs">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {wrongQs.length > 0 && (
                <button className="btn btn-mint" onClick={() => onRetry(wrongQs.map((w) => w.qq))}>
                  Retry {wrongQs.length} missed
                </button>
              )}
              <button className="btn" onClick={() => onRetry(questions)}>
                Retake this set
              </button>
              <button className="btn" onClick={onExit}>
                New session
              </button>
            </div>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {(
            [
              ["wrong", `Wrong & skipped (${wrongQs.length})`],
              ["all", `All questions (${n})`],
              ["cards", `Flashcards (${n})`],
            ] as const
          ).map(([k, label]) => (
            <button key={k} className={`pill ${tab === k ? "pill-active" : ""}`} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>

        <div key={tab} className="page grid gap-5">
          {tab === "wrong" &&
            (wrongQs.length ? (
              wrongQs.map(({ qq, i }) => <Review key={qq.key} q={qq} picked={answers[i]} index={i} hints={hints[i]} />)
            ) : (
              <div className="glass-card no-pop p-8 text-center">
                <div className="mb-2 text-4xl">🌟</div>
                <div className="f-display text-2xl">Perfect score!</div>
                <p className="f-small t-muted mt-1">Nothing to revisit. Check “All questions” for the explanations.</p>
              </div>
            ))}
          {tab === "all" && questions.map((qq, i) => <Review key={qq.key} q={qq} picked={answers[i]} index={i} hints={hints[i]} />)}
          {tab === "cards" && <FlashStack cards={questions} />}
        </div>
      </div>
    );
  }

  /* ------------------------------ RUN ------------------------------ */
  const unitName = getUnit(q.paper, q.unit)?.name;
  const wasCorrect = isDone && picked === q.answer;
  const hintLevel = hints[idx];
  return (
    <div className="page" ref={top}>
      <div className="mb-5 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="f-medium mb-1 flex items-center justify-between text-sm">
            <span className="truncate">{title}</span>
            <span className="f-small t-muted ml-3 flex-none">
              ⏱ {fmt(secs)} · {score} ✓
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="bar-fill h-full rounded-full bg-gradient-to-r from-[var(--mint)] to-[var(--mint-bright)]" style={{ width: `${((idx + (isDone ? 1 : 0)) / n) * 100}%` }} />
          </div>
        </div>
        <button className="btn !px-4 !py-2 text-sm" onClick={() => (answers.some((a) => a !== null) ? finish() : onExit())}>
          End
        </button>
      </div>

      <div key={idx} className="glass-card p-6 sm:p-8">
        <span className={`pointer-events-none absolute inset-0 rounded-[24px] ${isDone ? (wasCorrect ? "flash-green" : "flash-red") : ""}`} />
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="f-medium rounded-full bg-black/25 px-3 py-1">
            Question {idx + 1} / {n}
          </span>
          <span className="f-medium t-mint">{q.kind}</span>
          <span className="f-small t-muted">
            · Unit {q.unit}
            {unitName ? ` · ${unitName}` : ""}
          </span>
          {q.source && <span className="f-small t-muted ml-auto">{q.source}</span>}
        </div>

        <QuestionBody q={q} />

        <div className="mt-6 grid gap-3">
          {q.options.map((o, i) => {
            const isPicked = picked === i;
            const cls = isDone ? (i === q.answer ? "correct" : isPicked ? "wrong" : "") : "";
            const st = struck[idx].includes(i) && !isDone ? "struck" : "";
            return (
              <button key={i} className={`opt ${cls} ${st}`} onClick={() => choose(i)} disabled={isDone}>
                <span className="letter">{L[i]}</span>
                <span className="f-small pt-0.5 text-[0.98rem] leading-snug">{o}</span>
                {isDone && i === q.answer && picked === i && <Confetti key={confetti} />}
              </button>
            );
          })}
        </div>

        {hintLevel > 0 && !isDone && (
          <div className="rise mt-5 rounded-2xl border border-[var(--mint)]/30 bg-[var(--mint-soft)] p-4">
            <div className="f-medium t-mint mb-1 text-xs uppercase tracking-wider">💡 Hint</div>
            <ul className="f-small grid gap-1 text-[0.95rem]">
              {q.hint.slice(0, 1).map((h, i) => (
                <li key={i}>{h}</li>
              ))}
              {hintLevel >= 2 && <li>One wrong option has been crossed out for you.</li>}
            </ul>
          </div>
        )}

        {isDone && (
          <div className={`rise f-medium mt-5 rounded-2xl px-4 py-3 text-sm ${wasCorrect ? "bg-[var(--green)]/15 text-[var(--green)]" : "bg-[var(--red)]/15 text-[#f3a8a2]"}`}>
            {wasCorrect ? "✓ Correct! Nicely done." : "✗ Not quite. The explanation will be available when the session ends."}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {!isDone && (
            <button className="btn" onClick={takeHint} disabled={hintLevel >= 2}>
              💡 {hintLevel === 0 ? "Show hint" : hintLevel === 1 ? "Another hint (cross out an option)" : "No more hints"}
            </button>
          )}
          <div className="ml-auto flex gap-3">
            {!isDone && (
              <button className="btn" onClick={next}>
                Skip
              </button>
            )}
            {isDone && (
              <button className="btn btn-mint" onClick={next}>
                {idx < n - 1 ? "Next question →" : "Finish & see results"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
