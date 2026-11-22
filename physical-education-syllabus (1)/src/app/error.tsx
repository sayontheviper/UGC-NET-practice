"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="page">
      <div className="glass-card no-pop mx-auto mt-10 max-w-lg p-8 text-center">
        <div className="mb-3 text-4xl">☕</div>
        <h1 className="f-display text-3xl">Something spilled</h1>
        <p className="f-small t-muted mt-2 text-sm">This screen hit an unexpected error. Your saved progress is safe — try again.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button className="btn btn-mint" onClick={reset}>
            Try again
          </button>
          <a className="btn" href="/">
            Back home
          </a>
        </div>
      </div>
    </div>
  );
}
