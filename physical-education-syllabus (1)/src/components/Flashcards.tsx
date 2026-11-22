"use client";

import { useEffect, useRef, useState } from "react";
import type { Question } from "@/lib/types";
import { QuestionBody } from "@/components/Visuals";

export default function FlashStack({ cards, onKnown }: { cards: Question[]; onKnown?: (q: Question) => void }) {
  const [deck, setDeck] = useState<Question[]>(cards);
  const [flipped, setFlipped] = useState(false);
  const [leaving, setLeaving] = useState<"know" | "again" | null>(null);
  const [known, setKnown] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDeck(cards);
    setFlipped(false);
    setLeaving(null);
    setKnown(0);
  }, [cards]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function dismiss(kind: "know" | "again") {
    if (leaving || !deck.length) return;
    setLeaving(kind);
    const top = deck[0];
    timer.current = setTimeout(() => {
      setFlipped(false);
      setLeaving(null);
      setDeck((d) => (kind === "know" ? d.slice(1) : [...d.slice(1), d[0]]));
      if (kind === "know") {
        setKnown((k) => k + 1);
        onKnown?.(top);
      }
    }, 460);
  }

  if (!deck.length) {
    return (
      <div className="glass-card no-pop mx-auto max-w-md p-10 text-center">
        <div className="float mb-3 text-5xl">🎉</div>
        <h3 className="f-display text-2xl">Deck complete</h3>
        <p className="f-small t-muted mt-2">You went through all {known} cards. Great revision!</p>
        <button
          className="btn btn-mint mt-5"
          onClick={() => {
            setDeck(cards);
            setKnown(0);
          }}
        >
          Restart deck
        </button>
      </div>
    );
  }

  const visible = deck.slice(0, 4);
  return (
    <div>
      <div className="f-small t-muted mb-4 text-center text-sm">
        {deck.length} card{deck.length > 1 ? "s" : ""} left · {known} mastered · tap the card to flip
      </div>
      <div className="stack">
        {visible
          .map((q, i) => {
            const top = i === 0;
            const out = top && leaving;
            const dir = leaving === "know" ? 1 : -1;
            const style: React.CSSProperties = out
              ? { transform: `translate3d(${dir * 125}%, -30px, 0) rotate(${dir * 14}deg)`, opacity: 0, zIndex: 20 }
              : {
                  transform: `translate3d(${i % 2 ? i * 6 : -i * 6}px, ${i * 24}px, ${-i * 50}px) scale(${1 - i * 0.055}) rotate(${i % 2 ? i * 1.4 : -i * 1.4}deg)`,
                  opacity: 1 - i * 0.16,
                  zIndex: 10 - i,
                  pointerEvents: top ? "auto" : "none",
                };
            const correct = q.options[q.answer];
            return (
              <div key={q.key} className={`fcard ${top && flipped ? "flipped" : ""}`} style={style} onClick={() => top && !leaving && setFlipped((f) => !f)}>
                <div className="inner">
                  <div className="face front">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="f-medium t-mint text-xs uppercase tracking-wider">{q.kind}</span>
                      <span className="f-small t-muted text-xs">{q.topic}</span>
                    </div>
                    <QuestionBody q={q} />
                    <div className="f-small t-muted mt-4 text-xs">Tap to reveal the answer ↻</div>
                  </div>
                  <div className="face back">
                    <div className="f-medium t-mint mb-2 text-xs uppercase tracking-wider">Answer</div>
                    <div className="f-display mb-3 text-xl leading-snug">
                      {"ABCD"[q.answer]}. {correct}
                    </div>
                    <div className="f-medium mb-1 text-xs uppercase tracking-wider opacity-70">Explanation</div>
                    <p className="f-small text-[0.95rem] leading-relaxed">{q.explanation}</p>
                  </div>
                </div>
              </div>
            );
          })
          .reverse()}
      </div>
      <div className="mt-8 flex justify-center gap-3">
        <button className="btn" onClick={() => dismiss("again")} disabled={!!leaving}>
          ↺ Review again
        </button>
        <button className="btn" onClick={() => setFlipped((f) => !f)}>
          Flip
        </button>
        <button className="btn btn-mint" onClick={() => dismiss("know")} disabled={!!leaving}>
          Got it ✓
        </button>
      </div>
    </div>
  );
}
