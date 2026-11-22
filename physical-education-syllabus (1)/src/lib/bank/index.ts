import type { Difficulty, Question } from "@/lib/types";
import { PAPERS } from "@/lib/syllabus";
import { generateDirect, generateFromData, hashStr, mulberry, pick, shuffle, type Base, type RNG } from "./engine";
import { P2A } from "./p2a";
import { P2B } from "./p2b";
import { P1 } from "./p1";
import { DI_GENS, LOGIC_GENS, MATH_GENS, comprehensionGen } from "./quant";
import { P2_CALC } from "./calc2";

/** Each unit has a deep bank of 2,500 addressable questions. */
export const BANK_SIZE = 2500;
/** Size of the addressable seed space; it yields 2,500+ distinct questions for every unit. */
const SPACE = 12000;

const P2 = { ...P2A, ...P2B };
const TIER: Record<Exclude<Difficulty, "mixed">, 1 | 2 | 3> = { easy: 1, medium: 2, hard: 3 };

function runProcedural(gens: ((r: RNG, b: Base) => Question | null)[], paper: 1 | 2, unit: number, idx: number, diff: Difficulty): Question | null {
  let fallback: Question | null = null;
  for (let attempt = 0; attempt < 14; attempt++) {
    const r = mulberry(hashStr(`proc.${paper}.${unit}`) + idx * 104729 + attempt * 7717);
    const g = pick(r, gens);
    const q = g(r, { paper, unit, idx, tier: 2 });
    if (!q) continue;
    if (diff === "mixed" || q.difficulty === TIER[diff]) return q;
    fallback = fallback ?? q;
  }
  return fallback;
}

export function makeQuestion(paper: 1 | 2, unit: number, idx: number, diff: Difficulty): Question | null {
  const roll = hashStr(`roll.${paper}.${unit}.${idx}`) % 100;
  if (paper === 2) {
    const data = P2[unit];
    if (!data) return null;
    const calc = P2_CALC[unit];
    if (calc && roll < 14) {
      const q = runProcedural(calc, 2, unit, idx, diff);
      if (q) return q;
    }
    return generateFromData(data, 2, unit, idx, diff);
  }
  switch (unit) {
    case 3:
      return runProcedural([comprehensionGen], 1, 3, idx, diff);
    case 5:
      return runProcedural(MATH_GENS, 1, 5, idx, diff);
    case 6:
      if (roll < 22 && P1[6]) {
        const q = generateDirect(P1[6], 1, 6, idx);
        if (q) return q;
      }
      return runProcedural(LOGIC_GENS, 1, 6, idx, diff);
    case 7:
      if (roll < 12 && P1[7]) {
        const q = generateDirect(P1[7], 1, 7, idx);
        if (q) return q;
      }
      return runProcedural(DI_GENS, 1, 7, idx, diff);
    default: {
      const data = P1[unit];
      return data ? generateFromData(data, 1, unit, idx, diff) : null;
    }
  }
}

export interface SessionOptions {
  paper: 1 | 2;
  units: number[]; // empty = all units (mixed)
  count: number;
  difficulty: Difficulty;
  seen?: Set<string>;
}

/** Builds a practice session. Questions not practised before are preferred; repeats are allowed only when the bank runs out of unseen ones. */
export function buildSession(o: SessionOptions): Question[] {
  const allUnits = PAPERS.find((p) => p.id === o.paper)!.units.map((u) => u.n);
  const units = o.units.length ? o.units : allUnits;
  const seen = o.seen ?? new Set<string>();
  const out: Question[] = [];
  const used = new Set<string>();
  const starts: Record<number, number> = {};
  const counters: Record<number, number> = {};
  const rnd = Math.random;
  for (const u of units) {
    starts[u] = Math.floor(rnd() * SPACE);
    counters[u] = 0;
  }
  const order = shuffle(() => rnd(), units);
  const step = 7919; // prime, coprime with SPACE so we visit distinct indices
  for (let pass = 0; pass < 2 && out.length < o.count; pass++) {
    let guard = 0;
    while (out.length < o.count && guard < o.count * 60) {
      guard++;
      const unit = order[(guard - 1) % order.length];
      const idx = (starts[unit] + step * counters[unit]++) % SPACE;
      if (counters[unit] > SPACE) continue;
      const q = makeQuestion(o.paper, unit, idx, o.difficulty);
      if (!q || used.has(q.key)) continue;
      if (pass === 0 && seen.has(q.key)) continue;
      used.add(q.key);
      out.push(q);
    }
  }
  // interleave by unit order for mixed sessions, keep as generated
  return out;
}

/** A fixed, exam-pattern paper for a given year/session: 5 questions per unit for Paper I, 10 per unit for Paper II. */
export function buildPyqPaper(paper: 1 | 2, year: number, session: 0 | 1): Question[] {
  const units = PAPERS.find((p) => p.id === paper)!.units.map((u) => u.n);
  const per = paper === 1 ? 5 : 10;
  const seed = year * 2 + session;
  const out: Question[] = [];
  const used = new Set<string>();
  for (const unit of units) {
    let got = 0;
    let k = 0;
    while (got < per && k < 400) {
      const idx = hashStr(`pyq.${paper}.${seed}.${unit}.${k++}`) % SPACE;
      const q = makeQuestion(paper, unit, idx, "mixed");
      if (!q || used.has(q.key)) continue;
      used.add(q.key);
      out.push({ ...q, id: `pyq-${paper}-${seed}-${unit}-${got}`, source: `UGC NET ${session ? "December" : "June"} ${year} pattern` });
      got++;
    }
  }
  return out;
}
