"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PAPERS } from "@/lib/syllabus";

export function Confetti({ count = 30 }: { count?: number }) {
  const [bits] = useState(() =>
    Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const d = 70 + Math.random() * 110;
      return {
        x: Math.cos(a) * d,
        y: Math.sin(a) * d - 40,
        r: Math.round((Math.random() - 0.5) * 720),
        delay: Math.random() * 0.12,
        c: ["#74d39c", "#a6d4bd", "#c9f0d8", "#4fb980", "#e9f7ee"][i % 5],
      };
    }),
  );
  return (
    <span className="confetti" aria-hidden>
      {bits.map((b, i) => (
        <i key={i} style={{ "--x": `${b.x}px`, "--y": `${b.y}px`, "--r": `${b.r}deg`, "--d": `${b.delay}s`, "--c": b.c } as React.CSSProperties} />
      ))}
    </span>
  );
}

export function Pills<T extends string | number>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={String(o.value)} type="button" className={`pill ${o.value === value ? "pill-active" : ""}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Dropdown<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; sub?: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const cur = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative" style={{ zIndex: 40 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="glass-input f-medium flex items-center justify-between gap-3 text-left !text-[0.95rem] transition hover:border-[var(--mint)]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{cur?.label}</span>
        <svg width="16" height="16" viewBox="0 0 20 20" className={`flex-none transition-transform duration-300 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M5 8l5 5 5-5" />
        </svg>
      </button>
      {open && (
        <div className="dd-panel" role="listbox">
          {options.map((o) => (
            <button
              key={String(o.value)}
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`dd-item ${o.value === value ? "sel" : ""}`}
            >
              <span>
                <span className="f-medium block text-sm">{o.label}</span>
                {o.sub && <span className="f-small t-muted block text-xs">{o.sub}</span>}
              </span>
              {o.value === value && <span className="t-mint">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PaperToggle({ value, onChange }: { value: 1 | 2; onChange: (v: 1 | 2) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PAPERS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          className={`glass-card p-5 text-left ${value === p.id ? "!border-[var(--mint)] !bg-[rgba(143,191,168,0.1)]" : ""}`}
        >
          <div className="flex items-center justify-between">
            <span className="f-display text-xl">{p.name}</span>
            <span className={`grid h-6 w-6 place-items-center rounded-full border text-xs transition ${value === p.id ? "border-transparent bg-[var(--mint)] text-[#12261c]" : "border-white/20"}`}>{value === p.id ? "✓" : ""}</span>
          </div>
          <div className="f-medium mt-1 text-sm opacity-90">{p.code}</div>
          <div className="f-small t-muted mt-1 text-xs">{p.tagline}</div>
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <div className="f-medium mb-2 flex items-baseline justify-between text-sm">
        <span>{label}</span>
        {hint && <span className="f-small t-muted text-xs font-normal">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
