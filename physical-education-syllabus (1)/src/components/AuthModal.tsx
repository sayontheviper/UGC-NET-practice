"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useApp } from "@/components/Providers";

export default function AuthModal({ initial, onClose }: { initial: "login" | "signup"; onClose: () => void }) {
  const { setUser } = useApp();
  const [mode, setMode] = useState<"login" | "signup">(initial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      let j: { ok?: boolean; error?: string; user?: { id: number; name: string; email: string }; token?: string } = {};
      try {
        j = (await res.json()) as typeof j;
      } catch {
        j = {};
      }
      if (!res.ok || !j.ok || !j.user) {
        if (alive.current) setError(j.error ?? "Something went wrong. Please try again.");
        return;
      }
      // Loading the saved progress after this must never block or break the sign-in itself.
      try {
        setUser(j.user, j.token);
      } catch {
        if (alive.current) setError("Signed in, but your saved progress could not be loaded.");
      }
      onClose();
    } catch {
      if (alive.current) setError("Network problem. Please check your connection and try again.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal glass-card no-pop p-6 sm:p-7" role="dialog" aria-modal="true" aria-label="Sign in">
        <div className="mb-1 flex items-start justify-between">
          <h2 className="f-display text-3xl">{mode === "login" ? "Welcome back" : "Create account"}</h2>
          <button onClick={onClose} aria-label="Close" className="t-muted -mr-1 -mt-1 rounded-full p-2 text-xl leading-none transition hover:text-white">
            ×
          </button>
        </div>
        <p className="f-small t-muted mb-5 text-sm">Sign in to save your sessions, mistakes and flashcards to your account.</p>

        <div className="mb-5 flex gap-2 rounded-full bg-black/20 p-1">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={`f-medium flex-1 rounded-full py-2 text-sm transition-all duration-300 ${mode === m ? "bg-[var(--mint)] !text-[#12261c]" : "opacity-80 hover:opacity-100"}`}
            >
              {m === "login" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="grid gap-3" noValidate>
          {mode === "signup" && (
            <input className="glass-input f-small" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} />
          )}
          <input
            className="glass-input f-small"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            required
          />
          <input
            className="glass-input f-small"
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
          />
          {error && <div className="f-small rounded-xl border border-[var(--red)]/40 bg-[var(--red)]/10 px-3 py-2 text-sm text-[#f3a8a2]">{error}</div>}
          <button type="submit" className="btn btn-mint mt-1 w-full" disabled={busy}>
            {busy ? <span className="spinner" /> : mode === "login" ? "Sign in" : "Create my account"}
          </button>
          <p className="f-small t-muted text-center text-xs">
            {mode === "login" ? (
              <>
                New here?{" "}
                <button type="button" className="t-mint underline" onClick={() => setMode("signup")}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" className="t-mint underline" onClick={() => setMode("login")}>
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
