"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AttemptRecord, Question, UserData } from "@/lib/types";
import AuthModal from "@/components/AuthModal";

export interface User {
  id: number;
  name: string;
  email: string;
}

interface Ctx {
  user: User | null;
  ready: boolean;
  /** false when this deployment has no database, so sign-in is unavailable and progress stays local */
  accounts: boolean;
  data: UserData;
  attempts: AttemptRecord[];
  openAuth: (mode?: "login" | "signup") => void;
  setUser: (u: User | null, token?: string) => void;
  logout: () => Promise<void>;
  finishSession: (a: { title: string; mode: string; paper: number; questions: Question[]; answers: (number | null)[] }) => void;
  removeMistake: (key: string) => void;
}

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside provider");
  return c;
};

const EMPTY: UserData = { seen: [], mistakes: [], cards: [] };
const LS_DATA = "sayon_data_v2";
const LS_ATT = "sayon_attempts_v2";
const LS_TOKEN = "sayon_token";
const MAX_SEEN = 7000;

/* ------------------------- safe storage helpers ------------------------- */
function readLS<T>(k: string, fallback: T): T {
  try {
    const v = window.localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(k: string, v: unknown) {
  try {
    window.localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage full or blocked – progress stays in memory */
  }
}
function getToken(): string {
  try {
    return window.localStorage.getItem(LS_TOKEN) ?? "";
  } catch {
    return "";
  }
}
function setToken(t: string) {
  try {
    if (t) window.localStorage.setItem(LS_TOKEN, t);
    else window.localStorage.removeItem(LS_TOKEN);
  } catch {
    /* ignore */
  }
}
/** fetch that always attaches the bearer token, so auth works even when cookies are blocked */
export function apiFetch(url: string, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(url, { ...init, headers, cache: "no-store" });
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const asQuestions = (v: unknown): Question[] => {
  if (!Array.isArray(v)) return [];
  return v.filter((q): q is Question => {
    const o = q as Question;
    return isObj(q) && typeof o.key === "string" && typeof o.stem === "string" && Array.isArray(o.options) && o.options.length >= 2 && Number.isInteger(o.answer) && Array.isArray(o.hint);
  });
};
const normalize = (v: unknown): UserData => {
  if (!isObj(v)) return { ...EMPTY };
  const seen = Array.isArray(v.seen) ? v.seen.filter((x): x is string => typeof x === "string") : [];
  return {
    seen: Array.from(new Set(seen)).slice(-MAX_SEEN),
    mistakes: asQuestions(v.mistakes).slice(-150),
    cards: asQuestions(v.cards).slice(0, 150),
  };
};
const asAttempts = (v: unknown): AttemptRecord[] => {
  if (!Array.isArray(v)) return [];
  return v
    .filter((a) => isObj(a))
    .map((a) => {
      const o = a as Record<string, unknown> & { created_at?: string };
      return {
        id: String(o.id ?? Math.random().toString(36).slice(2)),
        title: String(o.title ?? "Session"),
        mode: String(o.mode ?? "practice"),
        paper: Number(o.paper) === 2 ? 2 : 1,
        score: Number(o.score) || 0,
        total: Number(o.total) || 0,
        createdAt: String(o.createdAt ?? o.created_at ?? new Date().toISOString()),
        detail: o.detail,
      } as AttemptRecord;
    })
    .slice(0, 100);
};

/** compact copy of a question so it is cheap to store */
const slim = (q: Question): Question => ({ ...q, hint: Array.isArray(q.hint) ? q.hint.slice(0, 2) : [] });

export default function Providers({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState(true);
  const [data, setData] = useState<UserData>(EMPTY);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [authMode, setAuthMode] = useState<"login" | "signup" | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userRef = useRef<User | null>(null);
  const dataRef = useRef<UserData>(EMPTY);
  const attemptsRef = useRef<AttemptRecord[]>([]);
  userRef.current = user;
  dataRef.current = data;
  attemptsRef.current = attempts;

  // device capability flags (keeps animation smooth on low-end phones)
  useEffect(() => {
    try {
      const el = document.documentElement;
      const nav = navigator as Navigator & { deviceMemory?: number };
      const cores = nav.hardwareConcurrency ?? 4;
      const mem = nav.deviceMemory ?? 4;
      if (cores <= 4 || mem <= 2) el.classList.add("lite");
      else if (cores >= 8 && mem >= 4) el.classList.add("fx-high");
    } catch {
      /* ignore */
    }
  }, []);

  const pushState = useCallback((d: UserData) => {
    if (!userRef.current) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      apiFetch("/api/sync", { method: "POST", body: JSON.stringify({ state: d }) }).catch(() => {});
    }, 1200);
  }, []);

  const applyData = useCallback(
    (d: UserData, a: AttemptRecord[]) => {
      const nd = normalize(d);
      const na = asAttempts(a);
      dataRef.current = nd;
      attemptsRef.current = na;
      setData(nd);
      setAttempts(na);
      const u = userRef.current;
      writeLS(u ? `${LS_DATA}_${u.id}` : LS_DATA, nd);
      writeLS(u ? `${LS_ATT}_${u.id}` : LS_ATT, na);
    },
    [],
  );

  const loadFor = useCallback(
    async (u: User | null) => {
      let merged = normalize(readLS<unknown>(u ? `${LS_DATA}_${u.id}` : LS_DATA, EMPTY));
      let atts = asAttempts(readLS<unknown>(u ? `${LS_ATT}_${u.id}` : LS_ATT, []));
      if (u) {
        try {
          // push anything practised as a guest before signing in
          const guestAtts = asAttempts(readLS<unknown>(LS_ATT, []));
          for (const g of guestAtts.slice(0, 20)) {
            await apiFetch("/api/sync", { method: "POST", body: JSON.stringify({ attempt: g }) }).catch(() => {});
          }
          if (guestAtts.length) {
            try {
              window.localStorage.removeItem(LS_ATT);
            } catch {
              /* ignore */
            }
          }
          const guestData = normalize(readLS<unknown>(LS_DATA, EMPTY));
          const res = await apiFetch("/api/sync");
          if (res.ok) {
            const j = (await res.json()) as { attempts?: unknown; state?: unknown };
            const s = normalize(j.state);
            const byKey = new Map<string, Question>();
            [...s.mistakes, ...merged.mistakes, ...guestData.mistakes].forEach((q) => byKey.set(q.key, q));
            merged = {
              seen: Array.from(new Set([...s.seen, ...merged.seen, ...guestData.seen])).slice(-MAX_SEEN),
              mistakes: Array.from(byKey.values()).slice(-150),
              cards: merged.cards.length ? merged.cards : s.cards,
            };
            atts = asAttempts(j.attempts);
            apiFetch("/api/sync", { method: "POST", body: JSON.stringify({ state: merged }) }).catch(() => {});
          }
        } catch {
          /* offline – keep the local copy */
        }
      }
      applyData(merged, atts);
    },
    [applyData],
  );

  // initial session check (cookie or stored bearer token)
  useEffect(() => {
    let alive = true;
    (async () => {
      let u: User | null = null;
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 6000);
        const res = await apiFetch("/api/auth/me", { signal: ctrl.signal });
        clearTimeout(timer);
        if (res.ok) {
          const j = (await res.json()) as { user?: User | null; accounts?: boolean };
          if (j.accounts === false) setAccounts(false);
          if (j.user && typeof j.user.id === "number") u = j.user;
        }
      } catch {
        /* offline */
      }
      if (!alive) return;
      setReady(true); // never leave the header waiting on the network
      setUserState(u);
      userRef.current = u;
      try {
        await loadFor(u);
      } catch {
        /* never block the app on sync problems */
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [loadFor]);

  const setUser = useCallback(
    (u: User | null, token?: string) => {
      if (token) setToken(token);
      if (!u && !token) setToken("");
      setUserState(u);
      userRef.current = u;
      loadFor(u).catch(() => setReady(true));
    },
    [loadFor],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setToken("");
    setUserState(null);
    userRef.current = null;
    try {
      await loadFor(null);
    } catch {
      applyData(EMPTY, []);
    }
  }, [loadFor, applyData]);

  const finishSession: Ctx["finishSession"] = useCallback(
    ({ title, mode, paper, questions, answers }) => {
      const score = questions.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0);
      const wrong = questions.filter((q, i) => answers[i] !== null && answers[i] !== q.answer).map(slim);
      const record: AttemptRecord = {
        id: `${Date.now()}`,
        title,
        mode,
        paper,
        score,
        total: questions.length,
        createdAt: new Date().toISOString(),
      };
      const prev = dataRef.current;
      const byKey = new Map<string, Question>();
      [...prev.mistakes, ...wrong].forEach((q) => byKey.set(q.key, q));
      const next: UserData = {
        seen: Array.from(new Set([...prev.seen, ...questions.map((q) => q.key)])).slice(-MAX_SEEN),
        mistakes: Array.from(byKey.values()).slice(-150),
        cards: questions.slice(0, 150).map(slim),
      };
      const na = [record, ...attemptsRef.current].slice(0, 100);
      applyData(next, na);
      pushState(next);
      if (userRef.current) {
        apiFetch("/api/sync", {
          method: "POST",
          body: JSON.stringify({ attempt: { title, mode, paper, score, total: questions.length, detail: { wrong: wrong.length } } }),
        }).catch(() => {});
      }
    },
    [applyData, pushState],
  );

  const removeMistake = useCallback(
    (key: string) => {
      const next = { ...dataRef.current, mistakes: dataRef.current.mistakes.filter((q) => q.key !== key) };
      applyData(next, attemptsRef.current);
      pushState(next);
    },
    [applyData, pushState],
  );

  const value = useMemo<Ctx>(
    () => ({ user, ready, accounts, data, attempts, openAuth: (m = "login") => setAuthMode(m), setUser, logout, finishSession, removeMistake }),
    [user, ready, accounts, data, attempts, setUser, logout, finishSession, removeMistake],
  );

  return (
    <AppCtx.Provider value={value}>
      {children}
      {authMode && <AuthModal initial={authMode} onClose={() => setAuthMode(null)} />}
    </AppCtx.Provider>
  );
}
