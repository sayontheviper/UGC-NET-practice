"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Question } from "@/lib/types";
import { useApp } from "@/components/Providers";
import FlashStack from "@/components/Flashcards";

export default function FlashcardsPage() {
  const { data, removeMistake, ready } = useApp();
  const [tab, setTab] = useState<"mistakes" | "last">("last");
  const [cards, setCards] = useState<Question[]>([]);
  const [picked, setPicked] = useState(false);

  // choose the best starting deck once saved data has loaded
  useEffect(() => {
    if (ready && !picked) {
      setPicked(true);
      if (data.mistakes.length) setTab("mistakes");
    }
  }, [ready, picked, data.mistakes.length]);

  // snapshot the deck when the tab changes so progress inside a deck is not reset mid-way
  useEffect(() => {
    if (!ready) return;
    setCards(tab === "mistakes" ? data.mistakes : data.cards);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, ready, picked]);

  return (
    <div className="page">
      <h1 className="f-display text-4xl sm:text-5xl">Flashcards</h1>
      <p className="f-small t-muted mt-2 max-w-2xl">Revise with a stacked deck. Flip a card to see the answer and explanation, then mark it as mastered or send it back to the end of the deck.</p>

      <div className="mb-8 mt-6 flex flex-wrap gap-2">
        <button className={`pill ${tab === "mistakes" ? "pill-active" : ""}`} onClick={() => setTab("mistakes")}>
          My mistakes ({data.mistakes.length})
        </button>
        <button className={`pill ${tab === "last" ? "pill-active" : ""}`} onClick={() => setTab("last")}>
          Last session ({data.cards.length})
        </button>
      </div>

      {cards.length ? (
        <FlashStack key={tab} cards={cards} onKnown={tab === "mistakes" ? (q) => removeMistake(q.key) : undefined} />
      ) : (
        <div className="glass-card no-pop mx-auto max-w-lg p-10 text-center">
          <div className="float mb-3 text-5xl">🗂️</div>
          <h3 className="f-display text-2xl">No cards yet</h3>
          <p className="f-small t-muted mt-2">Finish a practice, PYQ or AI session and every question becomes a flashcard. Questions you miss are saved here automatically.</p>
          <Link href="/practice" className="btn btn-mint mt-5">
            Start practising
          </Link>
        </div>
      )}
    </div>
  );
}
