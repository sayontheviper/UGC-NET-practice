import type { Question, Visual } from "@/lib/types";

/* ---------- random helpers ---------- */
export type RNG = () => number;
export function mulberry(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export const pick = <T,>(r: RNG, a: T[]): T => a[Math.floor(r() * a.length)];
export function shuffle<T>(r: RNG, a: T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
export const sample = <T,>(r: RNG, a: T[], n: number): T[] => shuffle(r, a).slice(0, n);
export const uniq = <T,>(a: T[]): T[] => Array.from(new Set(a));
export const randInt = (r: RNG, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

/* ---------- fact data model ---------- */
export interface Rel {
  topic: string;
  /** question stem containing {s}; the answer is the object */
  q: string;
  /** declarative statement containing {s} and {o} */
  t: string;
  /** optional reverse question containing {o}; the answer is the subject (only for one-to-one relations) */
  r?: string;
  /** "subject|object" pairs */
  pairs: string[];
  /** extra plausible distractor objects */
  extra?: string[];
  /** match-the-following column headings */
  lh?: string;
  rh?: string;
}
export interface SetDef {
  topic: string;
  /** noun phrase, e.g. "a type of muscle fibre" */
  x: string;
  in: string[];
  out: string[];
}
export interface SeqDef {
  topic: string;
  prompt: string;
  items: string[];
}
export interface ArDef {
  topic: string;
  a: string; // true assertion
  r: string; // true reason that explains a
  fa: string; // false version of the assertion
  fr: string; // false version of the reason
}
export interface UnitData {
  rels: Rel[];
  sets?: SetDef[];
  seqs?: SeqDef[];
  ars?: ArDef[];
}

type Pair = [string, string];
const parsePairs = (rel: Rel): Pair[] =>
  rel.pairs.map((p) => {
    const i = p.indexOf("|");
    return [p.slice(0, i), p.slice(i + 1)] as Pair;
  });
const fill = (t: string, s: string, o: string) => t.split("{s}").join(s).split("{o}").join(o);
const low = (s: string) => s.toLowerCase();

const ROM = ["I", "II", "III", "IV"];
const LET = ["A", "B", "C", "D"];

function finish(
  r: RNG,
  correct: string,
  wrong: string[],
): { options: string[]; answer: number } {
  const options = shuffle(r, [correct, ...wrong]);
  return { options, answer: options.indexOf(correct) };
}

export interface Base {
  paper: 1 | 2;
  unit: number;
  idx: number;
  tier: 1 | 2 | 3;
}

export function mk(b: Base, kind: string, topic: string, stem: string, rest: Partial<Question> & { options: string[]; answer: number; explanation: string; hint: string[] }): Question {
  const key = `${b.paper}.${b.unit}:${kind}:${rest.passage ?? ""}:${stem}|${(rest.lines ?? []).join("/")}|${rest.options[rest.answer]}`;
  return {
    id: `${b.paper}-${b.unit}-${b.idx}`,
    paper: b.paper,
    unit: b.unit,
    kind,
    topic,
    difficulty: b.tier,
    stem,
    key: String(hashStr(key)),
    ...rest,
  };
}

/* ---------- statement helper ---------- */
interface Stmt {
  text: string;
  truth: boolean;
  fix: string;
}
function wrongObjects(rel: Rel, pairs: Pair[], o: string): string[] {
  return uniq([...pairs.map((p) => p[1]), ...(rel.extra ?? [])]).filter((x) => low(x) !== low(o));
}
function makeStmts(r: RNG, d: UnitData, truths: boolean[]): { stmts: Stmt[]; topic: string } | null {
  const n = truths.length;
  const mix = r() < 0.3;
  const baseRel = pick(r, d.rels);
  const used = new Set<string>();
  const out: Stmt[] = [];
  for (const truth of truths) {
    const rel = mix ? pick(r, d.rels) : baseRel;
    const pairs = parsePairs(rel);
    if (pairs.length < 3) return null;
    let tries = 0;
    let p: Pair;
    do {
      p = pick(r, pairs);
      tries++;
    } while (used.has(rel.q + p[0]) && tries < 20);
    if (used.has(rel.q + p[0])) return null;
    used.add(rel.q + p[0]);
    const trueText = fill(rel.t, p[0], p[1]);
    if (truth) out.push({ text: trueText, truth: true, fix: trueText });
    else {
      const w = wrongObjects(rel, pairs, p[1]);
      if (!w.length) return null;
      out.push({ text: fill(rel.t, p[0], pick(r, w)), truth: false, fix: trueText });
    }
  }
  if (out.length !== n) return null;
  return { stmts: out, topic: mix ? "Mixed concepts" : baseRel.topic };
}
const stmtExplain = (stmts: Stmt[]) =>
  stmts
    .map((s, i) => `Statement ${ROM[i]} is ${s.truth ? "correct" : "incorrect"}. ${s.truth ? s.text : "Correct fact: " + s.fix}`)
    .join(" ");

/* ---------- format generators ---------- */
type Gen = (r: RNG, d: UnitData, b: Base) => Question | null;

const genMcq =
  (reverse: boolean): Gen =>
  (r, d, b) => {
    const rels = reverse ? d.rels.filter((x) => x.r) : d.rels;
    if (!rels.length) return null;
    const rel = pick(r, rels);
    const pairs = parsePairs(rel);
    const [s, o] = pick(r, pairs);
    const stem = reverse ? fill(rel.r!, s, o) : fill(rel.q, s, o);
    const ans = reverse ? s : o;
    let pool: { text: string; fix?: string }[];
    if (reverse) pool = uniq(pairs.filter((p) => low(p[0]) !== low(s)).map((p) => p[0])).map((t) => ({ text: t, fix: fill(rel.t, t, pairs.find((p) => p[0] === t)![1]) }));
    else {
      const seen = new Set<string>();
      pool = [];
      for (const p of pairs) {
        if (low(p[1]) === low(o) || seen.has(low(p[1]))) continue;
        seen.add(low(p[1]));
        pool.push({ text: p[1], fix: fill(rel.t, p[0], p[1]) });
      }
      for (const e of rel.extra ?? []) if (low(e) !== low(o) && !seen.has(low(e))) pool.push({ text: e });
    }
    if (pool.length < 3) return null;
    const wrong = sample(r, pool, 3);
    if (low(stem).includes(low(ans)) || wrong.some((w) => low(stem).includes(low(w.text)) && w.text.length > 3)) return null;
    const { options, answer } = finish(r, ans, wrong.map((w) => w.text));
    const others = wrong.filter((w) => w.fix).map((w) => w.fix).join(" ");
    const first = ans[0].toUpperCase();
    return mk(b, reverse ? "Direct MCQ (reverse)" : "Direct MCQ", rel.topic, stem, {
      options,
      answer,
      hint: [`Recall the concept: ${rel.topic}.`, `The correct option begins with the letter “${first}”.`],
      explanation: `${fill(rel.t, s, o)}${others ? " Why the others are wrong: " + others : ""}`,
    });
  };

const genPick =
  (wantTrue: boolean): Gen =>
  (r, d, b) => {
    const truths = wantTrue ? [true, false, false, false] : [false, true, true, true];
    const res = makeStmts(r, d, truths);
    if (!res) return null;
    const order = shuffle(r, res.stmts);
    const target = order.findIndex((s) => s.truth === wantTrue);
    const stem = wantTrue ? "Which one of the following statements is correct?" : "Which one of the following statements is NOT correct?";
    const expl = order.map((s, i) => `(${i + 1}) ${s.truth ? "Correct" : "Incorrect"}${s.truth ? "." : " — " + s.fix}`).join(" ");
    return mk(b, wantTrue ? "Choose the correct statement" : "Choose the incorrect statement", res.topic, stem, {
      options: order.map((s) => s.text),
      answer: target,
      hint: [`Topic: ${res.topic}. Test each option as a separate fact.`],
      explanation: expl,
    });
  };

const genStmt2: Gen = (r, d, b) => {
  const pattern = pick(r, [[true, true], [true, false], [false, true], [false, false], [true, true]]);
  const res = makeStmts(r, d, pattern);
  if (!res) return null;
  const options = ["Both I and II are correct", "Only I is correct", "Only II is correct", "Neither I nor II is correct"];
  const answer = pattern[0] && pattern[1] ? 0 : pattern[0] ? 1 : pattern[1] ? 2 : 3;
  return mk(b, "Statement-based", res.topic, "Read the two statements and choose the correct option:", {
    lines: res.stmts.map((s, i) => `Statement ${ROM[i]}: ${s.text}`),
    options,
    answer,
    hint: [`Topic: ${res.topic}.`, "Decide whether each statement is true on its own, then match the option."],
    explanation: stmtExplain(res.stmts),
  });
};

const genStmt3: Gen = (r, d, b) => {
  const sets: { label: string; truth: boolean[] }[] = [
    { label: "I and II only", truth: [true, true, false] },
    { label: "II and III only", truth: [false, true, true] },
    { label: "I and III only", truth: [true, false, true] },
    { label: "I, II and III", truth: [true, true, true] },
  ];
  const variant = r() < 0.5;
  const optionSets = variant
    ? sets
    : [
        { label: "I only", truth: [true, false, false] },
        { label: "II only", truth: [false, true, false] },
        { label: "III only", truth: [false, false, true] },
        { label: "I and II only", truth: [true, true, false] },
      ];
  const chosen = pick(r, optionSets);
  const res = makeStmts(r, d, chosen.truth);
  if (!res) return null;
  return mk(b, "Statement-based (three statements)", res.topic, "Consider the following statements. Which of them is/are correct?", {
    lines: res.stmts.map((s, i) => `Statement ${ROM[i]}: ${s.text}`),
    options: optionSets.map((o) => o.label),
    answer: optionSets.indexOf(chosen),
    hint: [`Topic: ${res.topic}.`, "Eliminate options using the statement you are most sure about."],
    explanation: stmtExplain(res.stmts) + ` So the correct combination is: ${chosen.label}.`,
  });
};

const genCount: Gen = (r, d, b) => {
  const cnt = randInt(r, 1, 4);
  const truths = shuffle(r, [true, true, true, true].map((_, i) => i < cnt));
  const res = makeStmts(r, d, truths);
  if (!res) return null;
  return mk(b, "Statement-based (how many correct)", res.topic, "How many of the following statements are correct?", {
    lines: res.stmts.map((s, i) => `${ROM[i]}. ${s.text}`),
    options: ["Only one", "Only two", "Only three", "All four"],
    answer: cnt - 1,
    hint: [`Topic: ${res.topic}.`, "Every statement must be judged separately; count the true ones."],
    explanation: stmtExplain(res.stmts) + ` Number of correct statements = ${cnt}.`,
  });
};

const genMatch: Gen = (r, d, b) => {
  const cands = d.rels.filter((rel) => {
    const ps = parsePairs(rel);
    return uniq(ps.map((p) => low(p[0]))).length >= 4 && uniq(ps.map((p) => low(p[1]))).length >= 4;
  });
  if (!cands.length) return null;
  const rel = pick(r, cands);
  const ps = parsePairs(rel);
  // choose 4 pairs with distinct subjects and objects
  const shuffled = shuffle(r, ps);
  const chosen: Pair[] = [];
  for (const p of shuffled) {
    if (chosen.every((c) => low(c[0]) !== low(p[0]) && low(c[1]) !== low(p[1]))) chosen.push(p);
    if (chosen.length === 4) break;
  }
  if (chosen.length < 4) return null;
  const rightOrder = shuffle(r, [0, 1, 2, 3]); // rightOrder[k] = index of chosen pair shown at position k
  const right = rightOrder.map((i) => chosen[i][1]);
  const correctMap = chosen.map((_, i) => rightOrder.indexOf(i)); // for left i -> right position
  const fmt = (m: number[]) => m.map((v, i) => `${LET[i]}-${v + 1}`).join(", ");
  const correct = fmt(correctMap);
  const wrongs = new Set<string>();
  let guard = 0;
  while (wrongs.size < 3 && guard++ < 60) {
    const m = shuffle(r, [0, 1, 2, 3]);
    const s = fmt(m);
    if (s !== correct) wrongs.add(s);
  }
  if (wrongs.size < 3) return null;
  const { options, answer } = finish(r, correct, Array.from(wrongs));
  const visual: Visual = { kind: "match", leftHead: rel.lh ?? "List I", rightHead: rel.rh ?? "List II", left: chosen.map((c) => c[0]), right };
  return mk(b, "Match the following", rel.topic, "Match List I with List II and choose the correct answer from the options given below:", {
    visual,
    options,
    answer,
    hint: [`Topic: ${rel.topic}. Start with the pair you know best and eliminate options.`],
    explanation: "Correct matching: " + chosen.map((c, i) => `${LET[i]} – ${c[1]}`).join("; ") + ".",
  });
};

const AR_OPTS = [
  "Both A and R are true and R is the correct explanation of A",
  "Both A and R are true but R is NOT the correct explanation of A",
  "A is true but R is false",
  "A is false but R is true",
];
const genArRel: Gen = (r, d, b) => {
  const pat = pick(r, [[true, true], [true, true], [true, false], [false, true]]);
  const res = makeStmts(r, d, pat);
  if (!res) return null;
  const answer = pat[0] && pat[1] ? 1 : pat[0] ? 2 : 3;
  return mk(b, "Assertion–Reason", res.topic, "Given below are two statements: Assertion (A) and Reason (R). Choose the correct answer:", {
    lines: [`Assertion (A): ${res.stmts[0].text}`, `Reason (R): ${res.stmts[1].text}`],
    options: AR_OPTS,
    answer,
    hint: [`Topic: ${res.topic}.`, "First test A and R separately for truth; only then ask whether R explains A."],
    explanation:
      `Assertion is ${pat[0] ? "true" : "false"}${pat[0] ? "" : " — correct fact: " + res.stmts[0].fix}. Reason is ${pat[1] ? "true" : "false"}${pat[1] ? "" : " — correct fact: " + res.stmts[1].fix}.` +
      (pat[0] && pat[1] ? " Both are true facts, but the reason is a separate fact and does not explain the assertion." : ""),
  });
};

const genArCausal: Gen = (r, d, b) => {
  const ars = d.ars ?? [];
  if (!ars.length) return null;
  const x = pick(r, ars);
  const v = randInt(r, 0, 3);
  let a = x.a,
    rr = x.r,
    ans = 0,
    why = `Assertion is true and the reason is true; the reason correctly explains the assertion: ${x.a} — because ${x.r}`;
  if (v === 1) {
    rr = x.fr;
    ans = 2;
    why = `Assertion is true (${x.a}) but the reason is false. Correct reason: ${x.r}`;
  } else if (v === 2) {
    a = x.fa;
    ans = 3;
    why = `Assertion is false. Correct statement: ${x.a} The reason given (${x.r}) is true.`;
  } else if (v === 3) {
    const others = ars.filter((y) => y !== x);
    if (!others.length) return null;
    rr = pick(r, others).r;
    ans = 1;
    why = `Both statements are true, but the reason does not explain the assertion. Actual explanation of the assertion: ${x.r}`;
  }
  return mk(b, "Assertion–Reason", x.topic, "Given below are two statements: Assertion (A) and Reason (R). Choose the correct answer:", {
    lines: [`Assertion (A): ${a}`, `Reason (R): ${rr}`],
    options: AR_OPTS,
    answer: ans,
    hint: [`Topic: ${x.topic}.`, "Ask: if A is true, does R actually cause or explain it?"],
    explanation: why,
  });
};

const genSeq: Gen = (r, d, b) => {
  const seqs = (d.seqs ?? []).filter((s) => s.items.length >= 3);
  if (!seqs.length) return null;
  const s = pick(r, seqs);
  const k = Math.min(4, s.items.length);
  const idxs = sample(r, s.items.map((_, i) => i), k).sort((x, y) => x - y);
  const ordered = idxs.map((i) => s.items[i]);
  const base = Array.from({ length: k }, (_, i) => i);
  const letters = LET.slice(0, k);
  const shown = shuffle(r, base); // shown[j] = ordered index displayed as letter j
  const lines = shown.map((oi, j) => `${letters[j]}. ${ordered[oi]}`);
  const correctSeq = base.map((oi) => letters[shown.indexOf(oi)]);
  const fmt = (a: string[]) => a.join(" → ");
  const correct = fmt(correctSeq);
  const wr = new Set<string>();
  let g = 0;
  while (wr.size < 3 && g++ < 80) {
    const f = fmt(shuffle(r, letters));
    if (f !== correct) wr.add(f);
  }
  if (wr.size < 3) return null;
  const { options, answer } = finish(r, correct, Array.from(wr));
  return mk(b, "Sequencing", s.topic, s.prompt, {
    lines,
    options,
    answer,
    hint: [`Topic: ${s.topic}. Place the first and last items first.`],
    explanation: `Correct order: ${ordered.join(" → ")}.`,
  });
};

const genSet =
  (positive: boolean): Gen =>
  (r, d, b) => {
    const sets = (d.sets ?? []).filter((s) => (positive ? s.out.length >= 3 : s.in.length >= 3 && s.out.length >= 1));
    if (!sets.length) return null;
    const s = pick(r, sets);
    if (positive) {
      const c = pick(r, s.in);
      const w = sample(r, s.out, 3);
      const { options, answer } = finish(r, c, w);
      return mk(b, "Identify the correct item", s.topic, `Which one of the following is ${s.x}?`, {
        options,
        answer,
        hint: [`Topic: ${s.topic}.`],
        explanation: `${c} is ${s.x}. The other options (${w.join(", ")}) are not.`,
      });
    }
    const c = pick(r, s.out);
    const w = sample(r, s.in, 3);
    const { options, answer } = finish(r, c, w);
    return mk(b, "Odd one out", s.topic, `Which one of the following is NOT ${s.x}?`, {
      options,
      answer,
      hint: [`Topic: ${s.topic}.`, "Three of the four belong to the same group."],
      explanation: `${c} is not ${s.x}, whereas each of the other options (${w.join(", ")}) is ${s.x}.`,
    });
  };

const TIERS: Record<1 | 2 | 3, Gen[]> = {
  1: [genMcq(false), genMcq(true), genSet(true), genSet(false), genPick(true), genPick(true), genStmt2],
  2: [genStmt2, genMatch, genArRel, genPick(false), genPick(true), genMcq(true), genArCausal, genSeq, genSet(false)],
  3: [genStmt3, genCount, genSeq, genArCausal, genMatch, genArRel, genPick(false), genStmt3],
};

export function generateFromData(d: UnitData, paper: 1 | 2, unit: number, idx: number, diff: "easy" | "medium" | "hard" | "mixed", salt = 0): Question | null {
  const r = mulberry(hashStr(`${paper}.${unit}.${diff}`) + idx * 7919 + salt);
  const tier: 1 | 2 | 3 = diff === "easy" ? 1 : diff === "medium" ? 2 : diff === "hard" ? 3 : pick(r, [1, 2, 2, 3, 3] as (1 | 2 | 3)[]);
  const gens = shuffle(r, TIERS[tier]);
  for (const g of gens) {
    const q = g(r, d, { paper, unit, idx, tier });
    if (q) return q;
  }
  // fall back to any tier
  for (const t of [2, 1, 3] as const) {
    for (const g of shuffle(r, TIERS[t])) {
      const q = g(r, d, { paper, unit, idx, tier });
      if (q) return q;
    }
  }
  return null;
}

/** Only direct-recall formats – used for units such as Mathematical Reasoning, Logical Reasoning and Data Interpretation where match/sequence/statement formats are not part of the pattern. */
export function generateDirect(d: UnitData, paper: 1 | 2, unit: number, idx: number, salt = 0): Question | null {
  const r = mulberry(hashStr(`direct.${paper}.${unit}`) + idx * 6007 + salt);
  const gens = shuffle(r, [genMcq(false), genMcq(true), genSet(true), genSet(false), genMcq(false)]);
  for (const g of gens) {
    const q = g(r, d, { paper, unit, idx, tier: 1 });
    if (q) return q;
  }
  return null;
}
