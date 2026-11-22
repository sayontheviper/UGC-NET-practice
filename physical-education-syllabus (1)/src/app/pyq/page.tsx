"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";
import { buildPyqPaper } from "@/lib/bank";
import { getPaper } from "@/lib/syllabus";
import Quiz from "@/components/Quiz";
import { PaperToggle } from "@/components/ui";

const YEARS = Array.from({ length: 10 }, (_, i) => 2025 - i);

export default function PyqPage() {
  const [paper, setPaper] = useState<1 | 2>(1);
  const [session, setSession] = useState<{ qs: Question[]; key: number; title: string } | null>(null);
  const info = getPaper(paper);

  function start(year: number, s: 0 | 1, quick: boolean) {
    let qs = buildPyqPaper(paper, year, s);
    if (quick) {
      const stepN = paper === 1 ? 2 : 4;
      qs = qs.filter((_, i) => i % stepN === 0);
    }
    setSession({ qs, key: Date.now(), title: `UGC NET ${s ? "Dec" : "June"} ${year} · ${info.name}${quick ? " · Quick" : ""}` });
  }

  if (session)
    return (
      <Quiz
        key={session.key}
        questions={session.qs}
        title={session.title}
        mode="pyq"
        paper={paper}
        onExit={() => setSession(null)}
        onRetry={(qs) => setSession({ qs, key: Date.now(), title: session.title + " (retry)" })}
      />
    );

  return (
    <div className="page">
      <h1 className="f-display text-4xl sm:text-5xl">PYQ Papers</h1>
      <p className="f-small t-muted mt-2 max-w-3xl">
        Ten years of exam-pattern papers (2016–2025, June and December sessions). Each paper follows the official blueprint — {paper === 1 ? "50 questions, 5 from each of the 10 units" : "100 questions, 10 from each of the 10 units"} — and is fixed, so you can re-attempt the same paper any time.
      </p>

      <div className="glass-card no-pop mt-6 p-5">
        <div className="f-medium t-mint text-sm">About these papers</div>
        <p className="f-small mt-1 text-sm leading-relaxed">
          These are <b className="f-medium">pattern-faithful practice papers</b> built on each session’s format and unit weightage — they are not word-for-word reproductions of NTA’s question booklets. For the original question papers and official answer keys, download them from the{" "}
          <a className="t-mint underline underline-offset-2" href="https://ugcnet.nta.ac.in/" target="_blank" rel="noreferrer">
            NTA UGC NET website
          </a>{" "}
          (Previous Year Question Papers section) and then use this site to practise and revise the same concepts.
        </p>
      </div>

      <div className="mt-6">
        <PaperToggle value={paper} onChange={setPaper} />
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {YEARS.map((y, i) => (
          <div key={y} className="glass-card rise p-6" style={{ ["--i" as string]: i }}>
            <div className="f-display text-4xl">{y}</div>
            <div className="f-small t-muted mt-1 text-xs">{info.name} · {paper === 1 ? "50" : "100"} questions</div>
            {([0, 1] as const).map((s) => (
              <div key={s} className="mt-4 flex items-center justify-between gap-2">
                <span className="f-medium text-sm">{s ? "December" : "June"}</span>
                <div className="flex gap-2">
                  <button className="btn !px-3 !py-1.5 text-xs" onClick={() => start(y, s, true)}>
                    Quick {paper === 1 ? 25 : 25}
                  </button>
                  <button className="btn btn-mint !px-3 !py-1.5 text-xs" onClick={() => start(y, s, false)}>
                    Full paper
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
