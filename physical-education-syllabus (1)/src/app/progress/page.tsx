"use client";

import Link from "next/link";
import { useApp } from "@/components/Providers";

const MODE: Record<string, string> = { practice: "Practice", pyq: "PYQ paper", ai: "AI session" };

export default function ProgressPage() {
  const { attempts, user, openAuth, data, ready, accounts } = useApp();
  const total = attempts.reduce((s, a) => s + a.total, 0);
  const correct = attempts.reduce((s, a) => s + a.score, 0);
  const acc = total ? Math.round((correct / total) * 100) : 0;
  const best = attempts.reduce((m, a) => Math.max(m, a.total ? Math.round((a.score / a.total) * 100) : 0), 0);
  const recent = attempts.slice(0, 12).reverse();

  return (
    <div className="page">
      <h1 className="f-display text-4xl sm:text-5xl">Progress</h1>
      <p className="f-small t-muted mt-2 max-w-2xl">
        {user ? `Signed in as ${user.name}. Your sessions, mistakes and flashcards are saved to your account.` : "You are practising as a guest — progress is saved on this device. Sign in to keep it safe across devices."}
      </p>
      {!user && ready && accounts && (
        <div className="mt-4 flex gap-3">
          <button className="btn btn-mint" onClick={() => openAuth("signup")}>
            Create account
          </button>
          <button className="btn" onClick={() => openAuth("login")}>
            Sign in
          </button>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Sessions", attempts.length],
          ["Questions answered", total],
          ["Overall accuracy", `${acc}%`],
          ["Best session", `${best}%`],
        ].map(([l, v], i) => (
          <div key={String(l)} className="glass-card rise p-5" style={{ ["--i" as string]: i }}>
            <div className="f-display text-3xl">{v}</div>
            <div className="f-small t-muted mt-1 text-xs">{l}</div>
          </div>
        ))}
      </div>

      <div className="glass-card no-pop mt-6 p-6">
        <div className="f-display mb-4 text-xl">Recent accuracy</div>
        {recent.length ? (
          <div className="flex h-40 items-end gap-2">
            {recent.map((a) => {
              const p = a.total ? (a.score / a.total) * 100 : 0;
              return (
                <div key={a.id} className="group relative flex h-full flex-1 flex-col justify-end">
                  <div className="bar-fill rounded-t-lg bg-gradient-to-t from-[#5f9680] to-[var(--mint-bright)] transition-all duration-500 group-hover:brightness-125" style={{ height: `${Math.max(p, 4)}%` }} />
                  <div className="f-small absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] opacity-0 transition group-hover:opacity-100">{Math.round(p)}%</div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="f-small t-muted text-sm">No sessions yet. Your accuracy trend will appear here after your first session.</p>
        )}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="glass-card no-pop p-6">
          <div className="f-display mb-3 text-xl">Session history</div>
          {attempts.length ? (
            <ul className="divide-y divide-white/10">
              {attempts.slice(0, 30).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="f-medium truncate text-sm">{a.title}</div>
                    <div className="f-small t-muted text-xs">
                      {MODE[a.mode] ?? a.mode} · {new Date(a.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="f-display flex-none text-lg">
                    {a.score}/{a.total}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="f-small t-muted text-sm">
              Nothing here yet — <Link href="/practice" className="t-mint underline">start a practice session</Link>.
            </p>
          )}
        </div>
        <div className="glass-card p-6">
          <div className="f-display mb-2 text-xl">Revision bank</div>
          <div className="f-small grid gap-2 text-sm">
            <div className="flex justify-between"><span className="t-muted">Questions seen</span><b className="f-medium">{data.seen.length}</b></div>
            <div className="flex justify-between"><span className="t-muted">Mistakes saved</span><b className="f-medium">{data.mistakes.length}</b></div>
          </div>
          <Link href="/flashcards" className="btn btn-mint mt-5 w-full">
            Open flashcards
          </Link>
        </div>
      </div>
    </div>
  );
}
