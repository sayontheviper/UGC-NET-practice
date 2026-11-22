import type { Question, Visual } from "@/lib/types";
import { mk, pick, shuffle, sample, randInt, uniq, type Base, type RNG } from "./engine";

type QGen = (r: RNG, b: Base) => Question | null;
export const fmtN = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));
export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

/** Build four numeric options (one correct) with plausible, distinct distractors. */
export function numChoices(r: RNG, c: number, f: (n: number) => string = fmtN, dec = 2): { options: string[]; answer: number } | null {
  const round = (x: number) => Math.round(x * 10 ** dec) / 10 ** dec;
  const mags = [0.5, 0.6, 0.75, 0.8, 0.9, 1.1, 1.2, 1.25, 1.5, 2];
  const offs = [-10, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 10];
  const pool = new Set<number>();
  for (const m of mags) pool.add(round(c * m));
  const scale = Math.max(1, Math.abs(c) >= 100 ? 10 : Math.abs(c) >= 20 ? 2 : 1);
  for (const o of offs) pool.add(round(c + o * scale));
  const cands = Array.from(pool).filter((x) => x !== c && x > 0 === c > 0 && Number.isFinite(x));
  if (cands.length < 3) return null;
  // prefer values close to the answer
  const close = cands.sort((a, b) => Math.abs(a - c) - Math.abs(b - c)).slice(0, 8);
  const wrong = sample(r, close, 3);
  const opts = shuffle(r, [c, ...wrong]);
  return { options: opts.map(f), answer: opts.indexOf(c) };
}

/* ====================== UNIT 5 : MATHEMATICAL REASONING ====================== */
const NAMES = ["Arun", "Meera", "Ravi", "Sita", "Kiran", "Anita", "Dev", "Lata", "Manoj", "Pooja", "Rahul", "Neha", "Ishaan", "Tara", "Vikram", "Zoya"];

const seriesGen: QGen = (r, b) => {
  const kind = randInt(r, 0, 5);
  let terms: number[] = [];
  let rule = "";
  let tier: 1 | 2 | 3 = 1;
  if (kind === 0) {
    const a = randInt(r, 2, 30), d = randInt(r, 3, 12);
    terms = Array.from({ length: 6 }, (_, i) => a + d * i);
    rule = `Each term is obtained by adding ${d} to the previous term.`;
  } else if (kind === 1) {
    const a = randInt(r, 2, 6), k = pick(r, [2, 3]);
    terms = Array.from({ length: 6 }, (_, i) => a * k ** i);
    rule = `Each term is ${k} times the previous term.`;
  } else if (kind === 2) {
    const s = randInt(r, 2, 9), c = pick(r, [0, 1, -1, 2]);
    terms = Array.from({ length: 6 }, (_, i) => (s + i) ** 2 + c);
    rule = `The terms follow n² ${c === 0 ? "" : c > 0 ? "+ " + c : "− " + -c} for n = ${s}, ${s + 1}, ${s + 2}, …`;
    tier = 2;
  } else if (kind === 3) {
    const a = randInt(r, 3, 20), p = randInt(r, 2, 6), q = randInt(r, 7, 12);
    terms = [a];
    for (let i = 1; i < 6; i++) terms.push(terms[i - 1] + (i % 2 ? p : q));
    rule = `Alternately add ${p} and ${q}.`;
    tier = 2;
  } else if (kind === 4) {
    const a = randInt(r, 1, 10), d = randInt(r, 1, 4), e = randInt(r, 1, 3);
    terms = [a];
    let step = d;
    for (let i = 1; i < 6; i++) {
      terms.push(terms[i - 1] + step);
      step += e;
    }
    rule = `The differences between consecutive terms are ${d}, ${d + e}, ${d + 2 * e}, … (they increase by ${e} each time).`;
    tier = 3;
  } else {
    const a = randInt(r, 1, 5), c = randInt(r, 2, 6);
    terms = [a, c];
    for (let i = 2; i < 7; i++) terms.push(terms[i - 1] + terms[i - 2]);
    terms = terms.slice(0, 6);
    rule = "Each term is the sum of the two preceding terms.";
    tier = 3;
  }
  const shown = terms.slice(0, 5);
  const ans = terms[5];
  const ch = numChoices(r, ans, fmtN, 0);
  if (!ch) return null;
  return mk({ ...b, tier }, "Number series", "Number series", `Find the next term of the series: ${shown.join(", ")}, ?`, {
    ...ch,
    hint: ["Look at the differences or ratios between consecutive terms."],
    explanation: `${rule} So the next term is ${ans}.`,
  });
};

const letterGen: QGen = (r, b) => {
  const A = (n: number) => String.fromCharCode(65 + ((n % 26) + 26) % 26);
  const kind = randInt(r, 0, 2);
  if (kind === 0) {
    const s = randInt(r, 0, 8), k = randInt(r, 2, 4);
    const t = Array.from({ length: 6 }, (_, i) => A(s + k * i));
    const ans = t[5];
    const wrong = uniq([A(s + k * 5 + 1), A(s + k * 5 - 1), A(s + k * 4 + k + 2), A(s + k * 5 + k)]).filter((x) => x !== ans);
    const opts = shuffle(r, [ans, ...wrong.slice(0, 3)]);
    return mk(b, "Letter series", "Letter series", `Which letter comes next in the series: ${t.slice(0, 5).join(", ")}, ?`, {
      options: opts,
      answer: opts.indexOf(ans),
      hint: ["Convert letters to their positions in the alphabet (A = 1, B = 2, …)."],
      explanation: `Each letter moves ${k} places forward in the alphabet, so the next letter is ${ans}.`,
    });
  }
  if (kind === 1) {
    const s = randInt(r, 0, 6), e = randInt(r, 18, 25);
    const pairs = Array.from({ length: 4 }, (_, i) => A(s + i) + A(e - i));
    const ans = A(s + 4) + A(e - 4);
    const wrong = [A(s + 4) + A(e - 3), A(s + 5) + A(e - 4), A(s + 3) + A(e - 4), A(s + 4) + A(e - 5)];
    const opts = shuffle(r, [ans, ...wrong.slice(0, 3)]);
    return mk({ ...b, tier: 2 }, "Letter series", "Letter-pair series", `Find the next group in the series: ${pairs.join(", ")}, ?`, {
      options: opts,
      answer: opts.indexOf(ans),
      hint: ["Treat the first letters and the second letters as two separate series."],
      explanation: `The first letters move forward by one place and the second letters move backward by one place each time. Next group: ${ans}.`,
    });
  }
  const w = pick(r, ["MIND", "BOOK", "PLAN", "TEAM", "GRADE", "LEARN", "STUDY", "WORLD", "PAPER", "NOTES"]);
  const k = randInt(r, 1, 4);
  const enc = (x: string, kk: number) => x.split("").map((ch) => A(ch.charCodeAt(0) - 65 + kk)).join("");
  const w2 = pick(r, ["CLASS", "SCORE", "MARKS", "THEORY", "SKILL", "ETHICS", "LOGIC"]);
  const ans = enc(w2, k);
  const wrong = uniq([enc(w2, k + 1), enc(w2, k - 1), enc(w2, -k), w2.split("").reverse().join("")]).filter((x) => x !== ans);
  const opts = shuffle(r, [ans, ...wrong.slice(0, 3)]);
  return mk({ ...b, tier: 2 }, "Coding–decoding", "Coding–decoding", `In a certain code, ${w} is written as ${enc(w, k)}. How is ${w2} written in that code?`, {
    options: opts,
    answer: opts.indexOf(ans),
    hint: ["Compare the first letter of the word with the first letter of its code to find the shift."],
    explanation: `Every letter is shifted ${k} place(s) forward in the alphabet. Applying this to ${w2} gives ${ans}.`,
  });
};

const sumLettersGen: QGen = (r, b) => {
  const w = pick(r, ["EXAM", "TEACH", "STUDY", "MATHS", "LOGIC", "DATA", "BOOK", "PAPER"]);
  const val = w.split("").reduce((s, c) => s + c.charCodeAt(0) - 64, 0);
  const ch = numChoices(r, val, fmtN, 0);
  if (!ch) return null;
  return mk(b, "Coding–decoding", "Alphabet values", `If A = 1, B = 2, C = 3, …, Z = 26, what is the sum of the values of the letters of the word “${w}”?`, {
    ...ch,
    hint: ["Write the position of each letter and add them."],
    explanation: `${w.split("").map((c) => `${c}=${c.charCodeAt(0) - 64}`).join(", ")}; total = ${val}.`,
  });
};

const relationGen: QGen = (r, b) => {
  const [A, B, C, D, E] = sample(r, NAMES, 5);
  const P: { s: string; ans: string; pool: string[] }[] = [
    { s: `${A} introduces ${B} as “the son of the only brother of my mother”. How is ${B} related to ${A}?`, ans: "Cousin", pool: ["Nephew", "Uncle", "Brother", "Cousin"] },
    { s: `${A} is the father of ${B}. ${C} is the mother of ${A}. ${D} is the father of ${C}. How is ${D} related to ${B}?`, ans: "Great-grandfather", pool: ["Grandfather", "Great-grandfather", "Uncle", "Father-in-law"] },
    { s: `${A} is the brother of ${B}. ${B} is the sister of ${C}. ${C} is the father of ${D}. How is ${A} related to ${D}?`, ans: "Uncle", pool: ["Father", "Grandfather", "Uncle", "Cousin"] },
    { s: `${A}’s mother is the sister of ${B}. How is ${B}, a woman, related to ${A}’s father?`, ans: "Sister-in-law", pool: ["Sister", "Sister-in-law", "Aunt", "Daughter-in-law"] },
    { s: `${A} is the father of ${B}. ${B} is the mother of ${C}. ${C} is the sister of ${D}. How is ${A} related to ${D}?`, ans: "Grandfather", pool: ["Father", "Grandfather", "Uncle", "Great-grandfather"] },
    { s: `${A} is the husband of ${B}. ${C} is the brother of ${B}. How is ${C} related to ${A}?`, ans: "Brother-in-law", pool: ["Brother", "Brother-in-law", "Son-in-law", "Cousin"] },
    { s: `Pointing to a woman, ${A} said, “She is the daughter of my grandfather’s only son.” How is the woman related to ${A}?`, ans: "Sister", pool: ["Cousin", "Sister", "Aunt", "Niece"] },
    { s: `${A}, a man, has a son who is the husband of ${B}. How is ${A} related to ${B}?`, ans: "Father-in-law", pool: ["Father", "Uncle", "Father-in-law", "Grandfather"] },
    { s: `${A} is the sister of ${B}. ${C} is the mother of ${B}. ${D} is the father of ${C}. ${E}, a man, is the son of ${D}. How is ${E} related to ${A}?`, ans: "Maternal uncle", pool: ["Paternal uncle", "Maternal uncle", "Cousin", "Grandfather"] },
    { s: `${A} says to ${B}, “Your mother’s only brother is my father.” How is ${B} related to ${A}?`, ans: "Cousin", pool: ["Brother", "Cousin", "Uncle", "Nephew"] },
  ];
  const p = pick(r, P);
  const opts = shuffle(r, p.pool);
  return mk({ ...b, tier: 2 }, "Blood relations", "Relationships", p.s, {
    options: opts,
    answer: opts.indexOf(p.ans),
    hint: ["Draw a small family tree and mark generations and gender."],
    explanation: `Drawing the family tree from the given statements shows the required relation is “${p.ans}”.`,
  });
};

const percentGen: QGen = (r, b) => {
  const k = randInt(r, 0, 4);
  if (k === 0) {
    const p = pick(r, [5, 12, 15, 20, 25, 30, 35, 40, 60, 75]);
    const n = pick(r, [80, 120, 160, 200, 240, 360, 400, 480, 640, 800]);
    const ans = (p * n) / 100;
    const ch = numChoices(r, ans);
    if (!ch) return null;
    return mk(b, "Percentage", "Percentage", `What is ${p}% of ${n}?`, { ...ch, hint: ["Percentage = (rate ÷ 100) × quantity."], explanation: `${p}% of ${n} = ${p}/100 × ${n} = ${fmtN(ans)}.` });
  }
  if (k === 1) {
    const x = pick(r, [20, 25, 40, 50, 60, 75, 80, 120, 150]);
    const y = pick(r, [200, 300, 400, 500, 600, 800, 1000]);
    const ans = (x / y) * 100;
    const ch = numChoices(r, ans);
    if (!ch) return null;
    return mk(b, "Percentage", "Percentage", `${x} is what percent of ${y}?`, { ...ch, hint: ["Percent = (part ÷ whole) × 100."], explanation: `(${x} ÷ ${y}) × 100 = ${fmtN(ans)}%.` });
  }
  if (k === 2) {
    const p = pick(r, [10, 20, 25, 40, 50]);
    const base = pick(r, [40, 80, 120, 200, 240, 400]);
    const res = (base * (100 + p)) / 100;
    const ch = numChoices(r, base);
    if (!ch) return null;
    return mk({ ...b, tier: 2 }, "Percentage", "Percentage", `A number increased by ${p}% becomes ${res}. What is the number?`, { ...ch, hint: ["New value = original × (100 + rate) / 100."], explanation: `Let the number be x. x × ${100 + p}/100 = ${res}, so x = ${base}.` });
  }
  if (k === 3) {
    const pop = pick(r, [10000, 20000, 50000, 80000, 100000]);
    const p = pick(r, [10, 20]);
    const ans = (pop * (100 + p) * (100 + p)) / 10000;
    const ch = numChoices(r, ans, (n) => n.toLocaleString("en-IN"), 0);
    if (!ch) return null;
    return mk({ ...b, tier: 3 }, "Percentage", "Percentage", `The population of a town is ${pop.toLocaleString("en-IN")}. If it increases by ${p}% every year, what will it be after 2 years?`, { ...ch, hint: ["Apply the growth factor (1 + rate/100) twice."], explanation: `${pop.toLocaleString("en-IN")} × (${100 + p}/100)² = ${ans.toLocaleString("en-IN")}.` });
  }
  const a = pick(r, [20, 25, 30, 40]);
  const c = pick(r, [10, 20, 25, 50]);
  const ans = a + c + (a * c) / 100;
  const ch = numChoices(r, ans);
  if (!ch) return null;
  return mk({ ...b, tier: 3 }, "Percentage", "Successive percentage change", `The price of an article is increased by ${a}% and then increased again by ${c}%. What is the net percentage increase?`, { ...ch, hint: ["Net change = a + b + ab/100."], explanation: `Net increase = ${a} + ${c} + (${a} × ${c})/100 = ${fmtN(ans)}%.` });
};

const ratioGen: QGen = (r, b) => {
  const k = randInt(r, 0, 3);
  if (k === 0) {
    const a = randInt(r, 2, 5), c = randInt(r, 3, 7);
    if (a === c) return null;
    const total = (a + c) * pick(r, [100, 200, 300, 400, 500]);
    const big = Math.max(a, c);
    const ans = (total * big) / (a + c);
    const ch = numChoices(r, ans, inr, 0);
    if (!ch) return null;
    return mk(b, "Ratio and proportion", "Ratio and proportion", `${inr(total)} is divided between two persons in the ratio ${a}:${c}. What is the larger share?`, { ...ch, hint: ["Larger share = total × (larger ratio term) / (sum of terms)."], explanation: `Sum of ratio terms = ${a + c}. Larger share = ${total} × ${big}/${a + c} = ${inr(ans)}.` });
  }
  if (k === 1) {
    const n1 = pick(r, [6, 8, 12, 15]);
    const price = pick(r, [30, 40, 60, 90, 120]);
    const n2 = n1 * pick(r, [2, 3, 4]);
    const cost = n1 * price;
    const ans = n2 * price;
    const ch = numChoices(r, ans, inr, 0);
    if (!ch) return null;
    return mk(b, "Ratio and proportion", "Direct proportion", `If ${n1} notebooks cost ${inr(cost)}, what is the cost of ${n2} notebooks?`, { ...ch, hint: ["Find the cost of one notebook first."], explanation: `Cost of one notebook = ${inr(price)}. Cost of ${n2} notebooks = ${inr(ans)}.` });
  }
  if (k === 2) {
    const x = randInt(r, 2, 5), y = randInt(r, 3, 7), z = randInt(r, 2, 6);
    if (x === y) return null;
    // a:b = x:y ; b:c = y:z  -> a:c = x:z  (both scaled)
    const ans = `${x * y}:${y * z}`;
    const g = (m: number, n: number): number => (n ? g(n, m % n) : m);
    const d = g(x * y, y * z);
    const simple = `${(x * y) / d}:${(y * z) / d}`;
    const wrong = uniq([`${x}:${z}`.length ? `${y}:${x}` : "", `${x + y}:${y + z}`, `${z}:${x}`, `${x * z}:${y * y}`]).filter((w) => w !== simple && w !== "");
    if (wrong.length < 3) return null;
    const opts = shuffle(r, [simple, ...wrong.slice(0, 3)]);
    void ans;
    return mk({ ...b, tier: 2 }, "Ratio and proportion", "Compound ratio", `If A : B = ${x} : ${y} and B : C = ${y} : ${z}, what is A : C?`, { options: opts, answer: opts.indexOf(simple), hint: ["Because B is common, the ratio A : C is x : z."], explanation: `Since B is the same in both ratios, A : C = ${x} : ${z} = ${simple}.` });
  }
  const ageA = randInt(r, 2, 4), ageB = randInt(r, 5, 7), m = pick(r, [4, 5, 6]);
  const years = pick(r, [5, 10]);
  const ca = ageA * m, cb = ageB * m;
  const ans = ca + years;
  const ch = numChoices(r, ans, fmtN, 0);
  if (!ch) return null;
  return mk({ ...b, tier: 3 }, "Ratio and proportion", "Ages", `The ages of two brothers are in the ratio ${ageA}:${ageB}. If the elder is ${cb} years old, how old will the younger be after ${years} years?`, { ...ch, hint: ["Find the value of one ratio unit first."], explanation: `One unit = ${cb}/${ageB} = ${m}. Younger now = ${ca}; after ${years} years = ${ans}.` });
};

const profitGen: QGen = (r, b) => {
  const k = randInt(r, 0, 3);
  const cp = pick(r, [200, 250, 400, 500, 800, 1000, 1200, 2000]);
  const p = pick(r, [10, 20, 25, 5, 15]);
  if (k === 0) {
    const sp = (cp * (100 + p)) / 100;
    const ch = numChoices(r, sp, inr, 0);
    if (!ch) return null;
    return mk(b, "Profit and loss", "Profit and loss", `An article bought for ${inr(cp)} is sold at a profit of ${p}%. What is its selling price?`, { ...ch, hint: ["SP = CP × (100 + profit%) / 100."], explanation: `SP = ${cp} × ${100 + p}/100 = ${inr(sp)}.` });
  }
  if (k === 1) {
    const sp = (cp * (100 - p)) / 100;
    const ch = numChoices(r, cp, inr, 0);
    if (!ch) return null;
    return mk({ ...b, tier: 2 }, "Profit and loss", "Profit and loss", `A shopkeeper sells an article for ${inr(sp)} at a loss of ${p}%. What was the cost price?`, { ...ch, hint: ["CP = SP × 100 / (100 − loss%)."], explanation: `CP = ${sp} × 100/${100 - p} = ${inr(cp)}.` });
  }
  if (k === 2) {
    const mp = pick(r, [500, 800, 1000, 1500, 2000]);
    const d1 = pick(r, [10, 20, 25]), d2 = pick(r, [10, 20]);
    const sp = (mp * (100 - d1) * (100 - d2)) / 10000;
    const ch = numChoices(r, sp, inr, 0);
    if (!ch) return null;
    return mk({ ...b, tier: 3 }, "Profit and loss", "Successive discounts", `The marked price of a book is ${inr(mp)}. After successive discounts of ${d1}% and ${d2}%, what is the selling price?`, { ...ch, hint: ["Apply the discounts one after the other, not by adding them."], explanation: `${mp} × ${100 - d1}/100 × ${100 - d2}/100 = ${inr(sp)}.` });
  }
  const loss = pick(r, [5, 10, 20]);
  const ans = p - loss - (p * loss) / 100;
  const ch = numChoices(r, Math.abs(ans) || 1);
  void ch;
  const sp1 = (cp * (100 + p)) / 100;
  const ex = sp1 - cp;
  const ch2 = numChoices(r, ex, inr, 0);
  if (!ch2) return null;
  return mk({ ...b, tier: 2 }, "Profit and loss", "Profit and loss", `A trader buys goods worth ${inr(cp)} and sells them at ${p}% profit. What is the profit in rupees?`, { ...ch2, hint: ["Profit = CP × profit% / 100."], explanation: `Profit = ${cp} × ${p}/100 = ${inr(ex)}.` });
};

const interestGen: QGen = (r, b) => {
  const k = randInt(r, 0, 2);
  if (k === 0) {
    const P = pick(r, [2000, 4000, 5000, 8000, 10000]);
    const R = pick(r, [5, 6, 8, 10, 12]);
    const T = pick(r, [2, 3, 4, 5]);
    const si = (P * R * T) / 100;
    const ch = numChoices(r, si, inr, 0);
    if (!ch) return null;
    return mk(b, "Simple and compound interest", "Simple interest", `What is the simple interest on ${inr(P)} at ${R}% per annum for ${T} years?`, { ...ch, hint: ["SI = P × R × T / 100."], explanation: `SI = ${P} × ${R} × ${T} / 100 = ${inr(si)}.` });
  }
  if (k === 1) {
    const R = pick(r, [5, 10, 20]);
    const P = R === 5 ? pick(r, [4000, 8000]) : R === 10 ? pick(r, [2000, 5000, 10000]) : pick(r, [2500, 5000]);
    const ci = (P * (100 + R) * (100 + R)) / 10000 - P;
    const ch = numChoices(r, ci, inr, 2);
    if (!ch) return null;
    return mk({ ...b, tier: 2 }, "Simple and compound interest", "Compound interest", `What is the compound interest on ${inr(P)} for 2 years at ${R}% per annum, compounded annually?`, { ...ch, hint: ["Amount = P (1 + R/100)ⁿ; CI = Amount − P."], explanation: `Amount = ${P} × (1 + ${R}/100)² = ${inr(P + ci)}. CI = ${inr(P + ci)} − ${inr(P)} = ${inr(ci)}.` });
  }
  const R = pick(r, [5, 10, 20]);
  const P = R === 5 ? 8000 : R === 10 ? pick(r, [5000, 10000]) : 5000;
  const diff = (P * R * R) / 10000;
  const ch = numChoices(r, diff, inr, 2);
  if (!ch) return null;
  return mk({ ...b, tier: 3 }, "Simple and compound interest", "CI and SI difference", `Find the difference between the compound interest and the simple interest on ${inr(P)} for 2 years at ${R}% per annum.`, { ...ch, hint: ["For 2 years, CI − SI = P (R/100)²."], explanation: `Difference = ${P} × (${R}/100)² = ${inr(diff)}.` });
};

const averageGen: QGen = (r, b) => {
  const k = randInt(r, 0, 2);
  if (k === 0) {
    const n = pick(r, [5, 6, 8, 10]);
    const avg = randInt(r, 20, 60);
    const out = avg + randInt(r, 5, 25);
    const newAvg = (avg * n - out) / (n - 1);
    if (!Number.isInteger(newAvg)) return null;
    const ch = numChoices(r, out, fmtN, 0);
    if (!ch) return null;
    return mk({ ...b, tier: 2 }, "Averages", "Averages", `The average of ${n} numbers is ${avg}. When one number is removed, the average of the remaining numbers becomes ${newAvg}. What is the number removed?`, { ...ch, hint: ["Total = average × number of items."], explanation: `Original total = ${avg * n}; new total = ${newAvg * (n - 1)}. Removed number = ${avg * n} − ${newAvg * (n - 1)} = ${out}.` });
  }
  if (k === 1) {
    const n = pick(r, [10, 20, 30, 50]);
    const ans = (n + 1) / 2;
    const ch = numChoices(r, ans);
    if (!ch) return null;
    return mk(b, "Averages", "Averages", `What is the average of the first ${n} natural numbers?`, { ...ch, hint: ["Average of 1 to n is (n + 1)/2."], explanation: `Sum = n(n+1)/2, so average = (n+1)/2 = ${fmtN(ans)}.` });
  }
  const ages = Array.from({ length: 5 }, () => randInt(r, 18, 30));
  const tot = ages.reduce((s, x) => s + x, 0);
  const ans = tot / 5;
  const ch = numChoices(r, ans);
  if (!ch) return null;
  return mk(b, "Averages", "Averages", `The ages (in years) of five research scholars are ${ages.join(", ")}. What is their average age?`, { ...ch, hint: ["Average = sum ÷ number of values."], explanation: `Sum = ${tot}; average = ${tot}/5 = ${fmtN(ans)} years.` });
};

const speedGen: QGen = (r, b) => {
  const k = randInt(r, 0, 3);
  if (k === 0) {
    const s = pick(r, [30, 40, 45, 60, 72, 80]);
    const t = pick(r, [2, 3, 4, 5]);
    const ans = s * t;
    const ch = numChoices(r, ans, (n) => `${n} km`, 0);
    if (!ch) return null;
    return mk(b, "Time and distance", "Time and distance", `A bus travels at ${s} km/h for ${t} hours. What distance does it cover?`, { ...ch, hint: ["Distance = speed × time."], explanation: `${s} × ${t} = ${ans} km.` });
  }
  if (k === 1) {
    const [a, c, avg] = pick(r, [[40, 60, 48], [30, 60, 40], [20, 30, 24], [60, 90, 72], [50, 75, 60]]);
    const ch = numChoices(r, avg, (n) => `${n} km/h`, 0);
    if (!ch) return null;
    return mk({ ...b, tier: 3 }, "Time and distance", "Average speed", `A person travels equal distances at ${a} km/h and ${c} km/h. What is the average speed for the whole journey?`, { ...ch, hint: ["For equal distances the average speed is 2ab/(a + b), not the simple average."], explanation: `Average speed = 2 × ${a} × ${c} / (${a} + ${c}) = ${avg} km/h.` });
  }
  if (k === 2) {
    const len = pick(r, [100, 150, 200, 250, 300]);
    const sec = pick(r, [10, 15, 20, 25]);
    const ms = len / sec;
    const kmh = ms * 3.6;
    const ch = numChoices(r, kmh, (n) => `${fmtN(n)} km/h`, 2);
    if (!ch) return null;
    return mk({ ...b, tier: 2 }, "Time and distance", "Trains", `A train ${len} m long crosses a signal post in ${sec} seconds. What is its speed in km/h?`, { ...ch, hint: ["Speed = length ÷ time in m/s; multiply by 18/5 to convert to km/h."], explanation: `Speed = ${len}/${sec} = ${fmtN(ms)} m/s = ${fmtN(kmh)} km/h.` });
  }
  const [x, y] = pick(r, [[12, 12], [10, 15], [20, 30], [12, 24], [15, 30], [30, 60]]);
  const ans = (x * y) / (x + y);
  const ch = numChoices(r, ans, (n) => `${n} days`, 0);
  if (!ch) return null;
  return mk({ ...b, tier: 2 }, "Time and work", "Time and work", `A can finish a piece of work in ${x} days and B can finish it in ${y} days. In how many days can they finish it working together?`, { ...ch, hint: ["Add the work done per day by each person."], explanation: `Together they do 1/${x} + 1/${y} = ${x + y}/${x * y} of the work per day, so they need ${ans} days.` });
};

const fractionGen: QGen = (r, b) => {
  const n1 = pick(r, [2, 3, 3, 4, 5]), d1 = pick(r, [3, 4, 5, 6]);
  const n2 = pick(r, [1, 2, 3]), d2 = pick(r, [2, 4, 5]);
  const base = d1 * d2 * pick(r, [5, 10, 20]);
  const ans = (((base * n1) / d1) * n2) / d2;
  if (!Number.isInteger(ans) || n1 >= d1 || n2 >= d2) return null;
  const ch = numChoices(r, ans, fmtN, 0);
  if (!ch) return null;
  return mk(b, "Fractions", "Fractions", `What is ${n1}/${d1} of ${n2}/${d2} of ${base}?`, { ...ch, hint: ["Work from right to left, converting “of” into multiplication."], explanation: `${n2}/${d2} of ${base} = ${(base * n2) / d2}; then ${n1}/${d1} of that = ${ans}.` });
};

export const MATH_GENS: QGen[] = [seriesGen, seriesGen, letterGen, sumLettersGen, relationGen, percentGen, percentGen, ratioGen, profitGen, interestGen, averageGen, speedGen, fractionGen];

/* ====================== UNIT 6 : LOGICAL REASONING ====================== */
type Form = "A" | "E" | "I" | "O";
const NOUNS = ["teachers", "scholars", "writers", "poets", "doctors", "athletes", "singers", "artists", "engineers", "students", "leaders", "authors", "farmers", "pilots", "dancers", "coaches", "judges", "chefs"];
const stm = (f: Form, a: string, c: string) => (f === "A" ? `All ${a} are ${c}` : f === "E" ? `No ${a.replace(/s$/, "")} is ${c.replace(/s$/, "") === c ? c : c}`.replace(/ is (.*)$/, ` is among ${c}`) : f === "I" ? `Some ${a} are ${c}` : `Some ${a} are not ${c}`);

// concl: [form, subjectVar, predicateVar]
interface Pat {
  prem: [Form, string, string][];
  valid: [Form, string, string][];
  invalid: [Form, string, string][];
}
const PATS: Pat[] = [
  { prem: [["A", "X", "Y"], ["A", "Y", "Z"]], valid: [["A", "X", "Z"]], invalid: [["A", "Z", "X"], ["E", "X", "Z"], ["O", "X", "Z"]] },
  { prem: [["A", "X", "Y"], ["I", "Z", "X"]], valid: [["I", "Z", "Y"], ["I", "Y", "Z"]], invalid: [["A", "Z", "Y"], ["E", "Z", "Y"], ["A", "Y", "X"]] },
  { prem: [["E", "X", "Y"], ["A", "Z", "X"]], valid: [["E", "Z", "Y"], ["E", "Y", "Z"]], invalid: [["I", "Z", "Y"], ["A", "Y", "Z"], ["A", "Z", "Y"]] },
  { prem: [["I", "X", "Y"], ["A", "Y", "Z"]], valid: [["I", "X", "Z"], ["I", "Z", "X"]], invalid: [["A", "X", "Z"], ["E", "X", "Z"], ["A", "Z", "X"]] },
  { prem: [["A", "X", "Y"], ["E", "Y", "Z"]], valid: [["E", "X", "Z"], ["E", "Z", "X"]], invalid: [["I", "X", "Z"], ["A", "Z", "X"], ["A", "X", "Z"]] },
  { prem: [["I", "X", "Y"], ["I", "Y", "Z"]], valid: [["I", "Y", "X"], ["I", "Z", "Y"]], invalid: [["I", "X", "Z"], ["A", "X", "Z"], ["E", "X", "Z"]] },
  { prem: [["A", "X", "Y"], ["A", "Z", "Y"]], valid: [], invalid: [["A", "X", "Z"], ["A", "Z", "X"], ["E", "X", "Z"]] },
  { prem: [["E", "X", "Y"], ["E", "Y", "Z"]], valid: [], invalid: [["E", "X", "Z"], ["I", "X", "Z"], ["A", "X", "Z"]] },
  { prem: [["O", "X", "Y"], ["A", "Y", "Z"]], valid: [], invalid: [["O", "X", "Z"], ["E", "X", "Z"], ["A", "Z", "X"]] },
  { prem: [["I", "X", "Y"], ["E", "Y", "Z"]], valid: [["O", "X", "Z"]], invalid: [["I", "X", "Z"], ["A", "X", "Z"], ["E", "X", "Z"]] },
];
const sentence = (f: Form, a: string, c: string) => (f === "A" ? `All ${a} are ${c}` : f === "E" ? `No ${a} are ${c}` : f === "I" ? `Some ${a} are ${c}` : `Some ${a} are not ${c}`);
void stm;

const syllogismGen: QGen = (r, b) => {
  const [x, y, z] = sample(r, NOUNS, 3);
  const map: Record<string, string> = { X: x, Y: y, Z: z };
  const pat = pick(r, PATS);
  const s = (c: [Form, string, string]) => sentence(c[0], map[c[1]], map[c[2]]);
  // choose two conclusions: weighted selection of validity
  const want = pick(r, [[1, 1], [1, 0], [0, 1], [0, 0], [1, 0], [0, 1]]);
  let c1: [Form, string, string] | undefined, c2: [Form, string, string] | undefined;
  const ok = (v: number, avoid?: [Form, string, string]) => {
    const pool = (v ? pat.valid : pat.invalid).filter((q) => q !== avoid);
    return pool.length ? pick(r, pool) : undefined;
  };
  c1 = ok(want[0]);
  c2 = ok(want[1], c1);
  if (!c1 || !c2) {
    // fall back to what the pattern allows
    c1 = pat.valid[0] ?? pick(r, pat.invalid);
    c2 = pick(r, pat.invalid.filter((q) => q !== c1));
    if (!c1 || !c2) return null;
  }
  const v1 = pat.valid.includes(c1), v2 = pat.valid.includes(c2);
  const options = ["Only conclusion I follows", "Only conclusion II follows", "Both conclusions I and II follow", "Neither conclusion I nor II follows"];
  const answer = v1 && v2 ? 2 : v1 ? 0 : v2 ? 1 : 3;
  const expl = `Drawing the Venn diagram for the premises: conclusion I (“${s(c1)}”) ${v1 ? "follows" : "does not necessarily follow"}, and conclusion II (“${s(c2)}”) ${v2 ? "follows" : "does not necessarily follow"}.`;
  return mk({ ...b, tier: 2 }, "Syllogism", "Syllogism (Venn diagrams)", "Two statements are followed by two conclusions. Taking the statements to be true, decide which conclusion(s) logically follow:", {
    lines: [`Statement 1: ${pat.prem.map((p) => s(p))[0]}.`, `Statement 2: ${pat.prem.map((p) => s(p))[1]}.`, `Conclusion I: ${s(c1)}.`, `Conclusion II: ${s(c2)}.`],
    options,
    answer,
    hint: ["Draw circles for the three groups and test each conclusion against every possible arrangement."],
    explanation: expl,
  });
};

const ANALOGY: Record<string, [string, string][]> = {
  "Tool : User": [["Pen", "Writer"], ["Scalpel", "Surgeon"], ["Hammer", "Carpenter"], ["Brush", "Painter"], ["Needle", "Tailor"], ["Chisel", "Sculptor"], ["Stethoscope", "Doctor"]],
  "Country : Capital": [["India", "New Delhi"], ["Japan", "Tokyo"], ["France", "Paris"], ["Egypt", "Cairo"], ["Kenya", "Nairobi"], ["Nepal", "Kathmandu"], ["Canada", "Ottawa"]],
  "Author : Work": [["Kalidasa", "Abhijnanashakuntalam"], ["Tulsidas", "Ramcharitmanas"], ["Tagore", "Gitanjali"], ["Premchand", "Godan"], ["Shakespeare", "Hamlet"], ["Valmiki", "Ramayana"]],
  "Animal : Young one": [["Cow", "Calf"], ["Dog", "Puppy"], ["Cat", "Kitten"], ["Horse", "Foal"], ["Sheep", "Lamb"], ["Goat", "Kid"]],
  "Quantity : SI unit": [["Length", "Metre"], ["Mass", "Kilogram"], ["Time", "Second"], ["Temperature", "Kelvin"], ["Electric current", "Ampere"], ["Force", "Newton"]],
  "Institution : Professional": [["Hospital", "Doctor"], ["School", "Teacher"], ["Court", "Judge"], ["Farm", "Farmer"], ["Laboratory", "Scientist"]],
};
const analogyGen: QGen = (r, b) => {
  const rel = pick(r, Object.keys(ANALOGY));
  const list = ANALOGY[rel];
  const [p1, p2] = sample(r, list, 2);
  const wrong = sample(r, list.filter((x) => x !== p2).map((x) => x[1]), 3);
  const opts = shuffle(r, [p2[1], ...wrong]);
  return mk(b, "Analogy", "Analogies", `Choose the option that completes the analogy:  ${p1[0]} : ${p1[1]} :: ${p2[0]} : ?`, {
    options: opts,
    answer: opts.indexOf(p2[1]),
    hint: [`Identify the relationship between the first two words (${rel.toLowerCase()}).`],
    explanation: `${p1[0]} and ${p1[1]} are related as ${rel.toLowerCase()}. In the same way, the word related to ${p2[0]} is ${p2[1]}.`,
  });
};

const VENN: Record<number, string[][]> = {
  0: [["Mango", "Fruit", "Food"], ["Sparrow", "Bird", "Animal"], ["Square", "Rectangle", "Quadrilateral"], ["Surgeon", "Doctor", "Human"], ["Delhi", "India", "Asia"], ["Teacher", "Professional", "Human"]],
  1: [["Cats", "Dogs", "Animals"], ["Pens", "Pencils", "Stationery"], ["Roses", "Lilies", "Flowers"], ["Tea", "Coffee", "Beverages"], ["Cricket", "Hockey", "Sports"]],
  2: [["Teachers", "Women", "Human beings"], ["Doctors", "Authors", "Persons"], ["Athletes", "Students", "Citizens"], ["Singers", "Dancers", "Artists"]],
  3: [["Tiger", "Table", "River"], ["Book", "Ocean", "Cloud"], ["Pencil", "Planet", "Pillow"], ["Lamp", "Mountain", "Violin"]],
};
const VOPTS = ["Three concentric circles (each inside the next)", "Two separate circles, both lying inside a third circle", "Two intersecting circles, both lying inside a third circle", "Three completely separate circles"];
const vennGen: QGen = (r, b) => {
  const t = pick(r, [0, 1, 2, 3]);
  const items = pick(r, VENN[t]);
  const shown = shuffle(r, items);
  const ex = [
    `${items[0]} are a kind of ${items[1]}, and ${items[1]} are a kind of ${items[2]}, so each group lies inside the next.`,
    `${items[0]} and ${items[1]} are different groups with nothing in common, and both belong to ${items[2]}.`,
    `Some ${items[0].toLowerCase()} can also be ${items[1].toLowerCase()}, so those two groups overlap, and both belong to ${items[2]}.`,
    `${items[0]}, ${items[1]} and ${items[2]} have nothing in common, so their circles are separate.`,
  ];
  return mk({ ...b, tier: 1 }, "Venn diagram", "Venn diagrams", `Which of the following diagrams best represents the relationship among: ${shown.join(", ")}?`, {
    options: VOPTS,
    answer: t,
    hint: ["Decide first which group is the largest and whether any two groups share members."],
    explanation: ex[t],
  });
};

const MF: { m: string; f: number }[] = ["AAA-1", "EAE-1", "AII-1", "EIO-1", "EAE-2", "AEE-2", "EIO-2", "AOO-2", "AII-3", "IAI-3", "EIO-3", "OAO-3", "AEE-4", "IAI-4", "EIO-4"].map((s) => ({ m: s, f: Number(s.split("-")[1]) }));
const moodGen: QGen = (r, b) => {
  const pick1 = pick(r, MF);
  const [mood, fig] = [pick1.m.split("-")[0], pick1.f];
  const forms = mood.split("") as Form[];
  const major = fig === 1 || fig === 3 ? ["M", "P"] : ["P", "M"];
  const minor = fig === 1 || fig === 2 ? ["S", "M"] : ["M", "S"];
  const wrong = uniq(sample(r, MF, 8).map((x) => x.m).filter((x) => x !== pick1.m)).slice(0, 3);
  const opts = shuffle(r, [pick1.m, ...wrong]);
  const L = (f: Form, a: string, c: string) => sentence(f, a, c);
  return mk({ ...b, tier: 3 }, "Mood and figure", "Mood and figure of a syllogism", "Identify the mood and figure of the following syllogism (major premise first):", {
    lines: [`Major premise: ${L(forms[0], major[0], major[1])}.`, `Minor premise: ${L(forms[1], minor[0], minor[1])}.`, `Conclusion: ${L(forms[2], "S", "P")}.`],
    options: opts,
    answer: opts.indexOf(pick1.m),
    hint: ["The mood is the sequence of proposition types (A, E, I, O); the figure depends on where the middle term M sits."],
    explanation: `The propositions are of types ${forms.join(", ")}, so the mood is ${mood}. The middle term M is the ${fig === 1 ? "subject of the major and predicate of the minor premise (figure 1)" : fig === 2 ? "predicate in both premises (figure 2)" : fig === 3 ? "subject in both premises (figure 3)" : "predicate of the major and subject of the minor premise (figure 4)"}. Hence ${pick1.m}.`,
  });
};

export const LOGIC_GENS: QGen[] = [syllogismGen, syllogismGen, syllogismGen, analogyGen, analogyGen, vennGen, moodGen];

/* ====================== UNIT 7 : DATA INTERPRETATION ====================== */
const CTX: { title: string; unit: string; rows: string[] }[] = [
  { title: "Students enrolled in different faculties", unit: "in hundreds", rows: ["Arts", "Science", "Commerce", "Law", "Education"] },
  { title: "Research papers published by universities", unit: "in numbers", rows: ["University A", "University B", "University C", "University D", "University E"] },
  { title: "Rice production in different states", unit: "in thousand tonnes", rows: ["Punjab", "Bihar", "Odisha", "Assam", "Kerala"] },
  { title: "Books issued by college libraries", unit: "in hundreds", rows: ["College P", "College Q", "College R", "College S", "College T"] },
  { title: "Number of candidates qualified in a national test from different regions", unit: "in thousands", rows: ["North", "South", "East", "West", "Central"] },
];
const YEARS = [2019, 2020, 2021, 2022, 2023];

function randomTable(r: RNG, cols = 4) {
  const ctx = pick(r, CTX);
  const years = YEARS.slice(0, cols);
  const data = ctx.rows.map(() => years.map(() => randInt(r, 8, 60) * 10));
  return { ctx, years, data };
}
const tableVisual = (c: (typeof CTX)[number], years: number[], data: number[][]): Visual => ({
  kind: "table",
  title: `${c.title} (${c.unit})`,
  head: ["", ...years.map(String)],
  rows: c.rows.map((n, i) => [n, ...data[i]]),
});
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

const tableGen: QGen = (r, b) => {
  const { ctx, years, data } = randomTable(r);
  const ri = randInt(r, 0, 4), ci = randInt(r, 0, 3);
  const k = randInt(r, 0, 5);
  const visual = tableVisual(ctx, years, data);
  const base = { visual, hint: ["Read the exact cells from the table first, then calculate."] };
  if (k === 0) {
    const ans = data.reduce((s, row) => s + row[ci], 0);
    const ch = numChoices(r, ans, fmtN, 0);
    if (!ch) return null;
    return mk(b, "Table-based DI", "Data interpretation – table", `What is the total for all categories in ${years[ci]}?`, { ...base, ...ch, explanation: `Sum of the ${years[ci]} column = ${data.map((x) => x[ci]).join(" + ")} = ${ans}.` });
  }
  if (k === 1) {
    const ans = data[ri].reduce((s, x) => s + x, 0) / 4;
    const ch = numChoices(r, ans, fmtN, 2);
    if (!ch) return null;
    return mk(b, "Table-based DI", "Data interpretation – table", `What is the average value for ${ctx.rows[ri]} over the four years?`, { ...base, ...ch, explanation: `(${data[ri].join(" + ")}) ÷ 4 = ${fmtN(ans)}.` });
  }
  if (k === 2) {
    const a = data[ri][0], c = data[ri][3];
    const ans = Math.round(((c - a) / a) * 1000) / 10;
    const ch = numChoices(r, Math.abs(ans) || 1, (n) => `${n}%`, 1);
    if (!ch || ans <= 0) return null;
    return mk({ ...b, tier: 2 }, "Table-based DI", "Data interpretation – table", `What is the percentage increase for ${ctx.rows[ri]} from ${years[0]} to ${years[3]}?`, { ...base, ...ch, explanation: `Increase = ${c} − ${a} = ${c - a}; percentage = ${c - a}/${a} × 100 = ${ans}%.` });
  }
  if (k === 3) {
    const r2 = (ri + 1 + randInt(r, 0, 3)) % 5;
    const a = data[ri][ci], c = data[r2][ci];
    const g = gcd(a, c);
    const ans = `${a / g}:${c / g}`;
    const wrong = uniq([`${c / g}:${a / g}`, `${(a + 10) / 10}:${c / 10}`, `${a / 10}:${(c + 10) / 10}`, `${a / g + 1}:${c / g}`]).filter((x) => x !== ans);
    const opts = shuffle(r, [ans, ...wrong.slice(0, 3)]);
    return mk({ ...b, tier: 2 }, "Table-based DI", "Data interpretation – table", `What is the ratio of the ${years[ci]} figure of ${ctx.rows[ri]} to that of ${ctx.rows[r2]}?`, { ...base, options: opts, answer: opts.indexOf(ans), explanation: `${a} : ${c} = ${ans} after dividing both by ${g}.` });
  }
  if (k === 4) {
    const col = data.map((x) => x[ci]);
    const mx = Math.max(...col);
    if (col.filter((x) => x === mx).length > 1) return null;
    const ans = ctx.rows[col.indexOf(mx)];
    const opts = shuffle(r, ctx.rows.slice(0, 4).includes(ans) ? ctx.rows.slice(0, 4) : [ans, ...ctx.rows.filter((x) => x !== ans).slice(0, 3)]);
    return mk(b, "Table-based DI", "Data interpretation – table", `Which category had the highest value in ${years[ci]}?`, { ...base, options: opts, answer: opts.indexOf(ans), explanation: `In ${years[ci]} the values are ${col.join(", ")}; the highest is ${mx} for ${ans}.` });
  }
  const tot = data.reduce((s, row) => s + row[ci], 0);
  const ans = Math.round((data[ri][ci] / tot) * 1000) / 10;
  const ch = numChoices(r, ans, (n) => `${n}%`, 1);
  if (!ch) return null;
  return mk({ ...b, tier: 3 }, "Table-based DI", "Data interpretation – table", `${ctx.rows[ri]} accounted for approximately what percentage of the total in ${years[ci]}?`, { ...base, ...ch, explanation: `Total in ${years[ci]} = ${tot}; share = ${data[ri][ci]}/${tot} × 100 ≈ ${ans}%.` });
};

const barGen: QGen = (r, b) => {
  const ctxs = [
    { t: "Boys and girls enrolled in a university", s: ["Boys", "Girls"], u: "in hundreds" },
    { t: "Production and sales of a publishing house", s: ["Production", "Sales"], u: "in thousand copies" },
    { t: "Papers submitted and accepted at a conference", s: ["Submitted", "Accepted"], u: "in numbers" },
  ];
  const c = pick(r, ctxs);
  const labels = YEARS.map(String);
  const s1 = labels.map(() => randInt(r, 8, 40) * 10);
  const s2 = labels.map(() => randInt(r, 8, 40) * 10);
  const visual: Visual = { kind: "bar", title: `${c.t} (${c.u})`, labels, series: [{ name: c.s[0], values: s1 }, { name: c.s[1], values: s2 }] };
  const k = randInt(r, 0, 3);
  const base = { visual, hint: ["Read the bar heights carefully for each year before calculating."] };
  if (k === 0) {
    const i = randInt(r, 0, 4);
    const ans = s1[i] + s2[i];
    const ch = numChoices(r, ans, fmtN, 0);
    if (!ch) return null;
    return mk(b, "Bar-chart DI", "Data interpretation – bar chart", `What is the combined value of ${c.s[0]} and ${c.s[1]} in ${labels[i]}?`, { ...base, ...ch, explanation: `${s1[i]} + ${s2[i]} = ${ans}.` });
  }
  if (k === 1) {
    const diffs = s1.map((x, i) => Math.abs(x - s2[i]));
    const mx = Math.max(...diffs);
    if (diffs.filter((d) => d === mx).length > 1) return null;
    const ans = labels[diffs.indexOf(mx)];
    const opts = shuffle(r, uniq([ans, ...sample(r, labels.filter((x) => x !== ans), 3)]));
    return mk({ ...b, tier: 2 }, "Bar-chart DI", "Data interpretation – bar chart", `In which year was the difference between ${c.s[0]} and ${c.s[1]} the greatest?`, { ...base, options: opts, answer: opts.indexOf(ans), explanation: `The yearly differences are ${diffs.join(", ")}; the largest, ${mx}, is in ${ans}.` });
  }
  if (k === 2) {
    const ans = s1.reduce((s, x) => s + x, 0) / 5;
    const ch = numChoices(r, ans, fmtN, 2);
    if (!ch) return null;
    return mk(b, "Bar-chart DI", "Data interpretation – bar chart", `What is the average yearly value of ${c.s[0]} over the five years?`, { ...base, ...ch, explanation: `(${s1.join(" + ")}) ÷ 5 = ${fmtN(ans)}.` });
  }
  const i = randInt(r, 0, 4);
  const ans = Math.round((s1[i] / s2[i]) * 1000) / 10;
  const ch = numChoices(r, ans, (n) => `${n}%`, 1);
  if (!ch) return null;
  return mk({ ...b, tier: 3 }, "Bar-chart DI", "Data interpretation – bar chart", `In ${labels[i]}, ${c.s[0]} was what percentage of ${c.s[1]}?`, { ...base, ...ch, explanation: `${s1[i]}/${s2[i]} × 100 ≈ ${ans}%.` });
};

const pieGen: QGen = (r, b) => {
  const cats = pick(r, [
    { t: "Expenditure of a university on different heads", l: ["Salaries", "Research", "Infrastructure", "Scholarships", "Administration"], tot: [240000, 360000, 480000, 600000] },
    { t: "Sources of income of a sports federation", l: ["Government grants", "Sponsorship", "Ticket sales", "Donations", "Membership fees"], tot: [200000, 300000, 500000, 800000] },
  ]);
  let rest = 100;
  const pcts: number[] = [];
  for (let i = 0; i < 4; i++) {
    const p = pick(r, [5, 10, 15, 20, 25]);
    pcts.push(p);
    rest -= p;
  }
  if (rest < 5) return null;
  pcts.push(rest);
  const total = pick(r, cats.tot);
  const visual: Visual = { kind: "pie", title: `${cats.t} (total ${inr(total)})`, labels: cats.l, values: pcts };
  const i = randInt(r, 0, 4);
  const j = (i + 1 + randInt(r, 0, 3)) % 5;
  const k = randInt(r, 0, 3);
  const base = { visual, hint: ["Each sector’s value = percentage × total ÷ 100; a full circle is 360°."] };
  if (k === 0) {
    const ans = (pcts[i] * total) / 100;
    const ch = numChoices(r, ans, inr, 0);
    if (!ch) return null;
    return mk(b, "Pie-chart DI", "Data interpretation – pie chart", `What amount was spent/received under “${cats.l[i]}”?`, { ...base, ...ch, explanation: `${pcts[i]}% of ${inr(total)} = ${inr(ans)}.` });
  }
  if (k === 1) {
    const ans = pcts[i] * 3.6;
    const ch = numChoices(r, ans, (n) => `${fmtN(n)}°`, 1);
    if (!ch) return null;
    return mk(b, "Pie-chart DI", "Data interpretation – pie chart", `What is the central angle of the sector for “${cats.l[i]}”?`, { ...base, ...ch, explanation: `${pcts[i]}% of 360° = ${fmtN(ans)}°.` });
  }
  if (k === 2) {
    const ans = (Math.abs(pcts[i] - pcts[j]) * total) / 100;
    if (ans === 0) return null;
    const ch = numChoices(r, ans, inr, 0);
    if (!ch) return null;
    return mk({ ...b, tier: 2 }, "Pie-chart DI", "Data interpretation – pie chart", `What is the difference between the amounts under “${cats.l[i]}” and “${cats.l[j]}”?`, { ...base, ...ch, explanation: `Difference in percentage = |${pcts[i]} − ${pcts[j]}| = ${Math.abs(pcts[i] - pcts[j])}%, i.e. ${inr(ans)}.` });
  }
  const g = gcd(pcts[i], pcts[j]);
  const ans = `${pcts[i] / g}:${pcts[j] / g}`;
  const wrong = uniq([`${pcts[j] / g}:${pcts[i] / g}`, `${pcts[i] / g + 1}:${pcts[j] / g}`, `${pcts[i] / g}:${pcts[j] / g + 1}`, `${pcts[i]}:${100 - pcts[i]}`]).filter((x) => x !== ans);
  const opts = shuffle(r, [ans, ...wrong.slice(0, 3)]);
  return mk({ ...b, tier: 2 }, "Pie-chart DI", "Data interpretation – pie chart", `What is the ratio of the amount under “${cats.l[i]}” to that under “${cats.l[j]}”?`, { ...base, options: opts, answer: opts.indexOf(ans), explanation: `${pcts[i]}% : ${pcts[j]}% = ${ans}.` });
};

const lineGen: QGen = (r, b) => {
  const title = pick(r, ["Number of candidates appearing for a national eligibility test (in thousands)", "Annual enrolment in an open university (in thousands)", "Number of research scholars registered in a university"]);
  let v = randInt(r, 10, 30) * 10;
  const vals = [v];
  for (let i = 1; i < 5; i++) {
    v = Math.max(20, v + pick(r, [-40, -20, 20, 40, 60, 80]));
    vals.push(v);
  }
  const labels = YEARS.map(String);
  const visual: Visual = { kind: "line", title, labels, series: [{ name: "Value", values: vals }] };
  const k = randInt(r, 0, 2);
  const base = { visual, hint: ["Read the point for each year on the line and compute year-to-year changes."] };
  if (k === 0) {
    const i = randInt(r, 0, 3);
    const ans = Math.round(((vals[i + 1] - vals[i]) / vals[i]) * 1000) / 10;
    if (ans === 0) return null;
    const ch = numChoices(r, Math.abs(ans), (n) => `${n}%`, 1);
    if (!ch) return null;
    const dir = ans > 0 ? "increase" : "decrease";
    return mk({ ...b, tier: 2 }, "Line-graph DI", "Data interpretation – line graph", `What was the percentage ${dir} from ${labels[i]} to ${labels[i + 1]}?`, { ...base, ...ch, explanation: `Change = ${vals[i + 1]} − ${vals[i]} = ${vals[i + 1] - vals[i]}; percentage = ${Math.abs(ans)}% (${dir}).` });
  }
  if (k === 1) {
    const ans = vals.reduce((s, x) => s + x, 0) / 5;
    const ch = numChoices(r, ans, fmtN, 2);
    if (!ch) return null;
    return mk(b, "Line-graph DI", "Data interpretation – line graph", "What is the average value over the five years shown?", { ...base, ...ch, explanation: `(${vals.join(" + ")}) ÷ 5 = ${fmtN(ans)}.` });
  }
  const diffs = vals.slice(1).map((x, i) => x - vals[i]);
  const mx = Math.max(...diffs);
  if (diffs.filter((d) => d === mx).length > 1) return null;
  const idx = diffs.indexOf(mx);
  const periods = labels.slice(1).map((l, i) => `${labels[i]}–${l}`);
  const ans = periods[idx];
  const opts = shuffle(r, periods);
  return mk({ ...b, tier: 2 }, "Line-graph DI", "Data interpretation – line graph", "During which period was the absolute increase the greatest?", { ...base, options: opts, answer: opts.indexOf(ans), explanation: `The year-to-year changes are ${diffs.join(", ")}; the greatest rise (${mx}) is during ${ans}.` });
};

export const DI_GENS: QGen[] = [tableGen, tableGen, barGen, barGen, pieGen, pieGen, lineGen];

/* ====================== UNIT 3 : COMPREHENSION ====================== */
const CITIES = ["Pune", "Jaipur", "Lucknow", "Bhopal", "Kochi", "Guwahati", "Ranchi", "Nagpur", "Mysuru", "Patna"];
interface CQ {
  stem: string;
  correct: string;
  wrong: string[];
  expl: string;
  tier?: 1 | 2 | 3;
}
type Family = (r: RNG) => { passage: string; qs: CQ[] };

const FAMILIES: Family[] = [
  (r) => {
    const n = pick(r, [500, 800, 1000, 1200, 2000]), city = pick(r, CITIES);
    const p1 = pick(r, [35, 40, 45, 50, 55]), p2 = pick(r, [20, 25, 30]);
    const none = n * (100 - p1 - p2) / 100;
    const onl = (n * p1) / 100;
    const nums = (c: number, extra: number[]) => {
      const w = uniq(extra.map((x) => Math.round(x))).filter((x) => x !== c).slice(0, 3);
      return w.map(String);
    };
    return {
      passage: `A survey of ${n} university students in ${city} found that ${p1}% preferred online lectures for theory courses, while ${p2}% preferred classroom lectures. The remaining students expressed no preference. The researchers noted that online lectures offered flexibility, whereas classrooms encouraged discussion. They therefore recommended a blended approach rather than a complete shift to either mode.`,
      qs: [
        { stem: "How many students expressed no preference?", correct: String(none), wrong: nums(none, [none * 1.5, none * 0.5, n * p2 / 100, n * (100 - p1) / 100]), expl: `Students with no preference = ${100 - p1 - p2}% of ${n} = ${none}.` },
        { stem: "How many students preferred online lectures?", correct: String(onl), wrong: nums(onl, [onl * 1.2, onl * 0.8, n * p2 / 100, n - onl]), expl: `${p1}% of ${n} = ${onl}.` , tier: 1 },
        { stem: "What did the researchers recommend?", correct: "A blended approach combining both modes", wrong: ["A complete shift to online lectures", "A complete return to classroom-only teaching", "Abolishing theory courses"], expl: "The passage says they recommended a blended approach rather than a complete shift to either mode." },
        { stem: "Which inference is best supported by the passage?", correct: "Students’ preferences about the mode of instruction were divided", wrong: ["All students preferred online lectures", "Classroom lectures had been abolished in the city", "The survey covered only practical subjects"], expl: "Since the percentages for the two modes differ and some students had no preference, opinion was divided.", tier: 2 },
      ],
    };
  },
  (r) => {
    const v = pick(r, ["Ralegan", "Hivre", "Kuthal", "Sundarpur", "Madhopur"]);
    const k = pick(r, [4, 6, 8, 12]), a = pick(r, [30, 40, 50, 60]), y = pick(r, [3, 4, 5]), m = pick(r, [2, 3, 4, 5]), c = pick(r, [15, 20, 25, 30]);
    return {
      passage: `The village of ${v} faced acute water shortage when its open wells dried up in summer. The community built ${k} check dams and adopted drip irrigation on ${a}% of its farmland. Within ${y} years the groundwater level rose by ${m} metres, and crop yield increased by ${c}%. Villagers say the experience has shown that local effort, backed by simple techniques, can reverse scarcity.`,
      qs: [
        { stem: "What led to the rise in groundwater level, according to the passage?", correct: "Check dams along with drip irrigation", wrong: ["Heavy sale of farmland", "Digging more open wells", "Stopping all farming activity"], expl: "The check dams and drip irrigation are the measures described." },
        { stem: `By how many metres did the groundwater level rise?`, correct: String(m), wrong: uniq([m + 1, m + 2, Math.max(1, m - 1), m * 2]).filter((x) => x !== m).slice(0, 3).map(String), expl: `The passage states that the level rose by ${m} metres.`, tier: 1 },
        { stem: "Which of the following is the most suitable title for the passage?", correct: `Community-led water conservation in ${v}`, wrong: [`Why farming should end in ${v}`, "The dangers of drip irrigation", "The history of check dams in Asia"], expl: "The passage as a whole describes a community’s successful conservation effort." },
        { stem: "Which conclusion can be drawn from the passage?", correct: "Local community action can help reverse water scarcity", wrong: ["Check dams are useful only in big cities", "Crop yield falls when water is conserved", "Water shortage cannot be solved at the village level"], expl: "The last sentence states the lesson explicitly.", tier: 2 },
      ],
    };
  },
  (r) => {
    const name = pick(r, ["SkillBridge", "LearnIndia", "GyanSetu", "PathShala Plus"]);
    const a = pick(r, [4, 6, 8, 10]), d = pick(r, [5, 7, 9, 12]);
    const b = a + d;
    return {
      passage: `Since the launch of ${name}, the number of registered learners has risen from ${a} lakh to ${b} lakh. Educators observed that learners who began with short modules were more likely to complete entire courses than those who started with long lectures. However, access remains uneven: in rural areas poor internet connectivity prevents many from benefiting. Experts argue that unless connectivity improves, digital platforms may widen, rather than narrow, educational gaps.`,
      qs: [
        { stem: `By how many lakh did the number of registered learners increase?`, correct: String(d), wrong: uniq([d + 1, d + 2, Math.max(1, d - 2), b]).filter((x) => x !== d).slice(0, 3).map(String), expl: `${b} − ${a} = ${d} lakh.`, tier: 1 },
        { stem: "According to the passage, which learners were more likely to complete entire courses?", correct: "Those who began with short modules", wrong: ["Those who began with long lectures", "Those who avoided online modules", "Those living only in rural areas"], expl: "The passage states this directly." },
        { stem: "Which barrier to digital learning does the passage mention?", correct: "Poor internet connectivity in rural areas", wrong: ["Lack of interest among educators", "High cost of short modules", "Shortage of course content"], expl: "Rural connectivity is the barrier named in the passage." },
        { stem: "The experts quoted in the passage warn that digital platforms may", correct: "widen educational gaps if connectivity does not improve", wrong: ["end the need for teachers", "reduce the number of registered learners", "make long lectures compulsory"], expl: "The last sentence gives this warning.", tier: 2 },
      ],
    };
  },
  (r) => {
    const city = pick(r, CITIES), mins = pick(r, [20, 30, 40]), w = pick(r, [8, 10, 12]), p = pick(r, [6, 8, 10, 12]);
    return {
      passage: `A school in ${city} introduced a daily ${mins}-minute physical activity period. After ${w} weeks, attendance had improved by ${p}% and teachers reported better concentration in class. Critics argued that the new period reduced the time available for academic subjects. The principal replied that the improved focus of students more than compensated for the lost time.`,
      qs: [
        { stem: "By what percentage did attendance improve after the introduction of the period?", correct: `${p}%`, wrong: uniq([p + 2, p + 4, Math.max(2, p - 2), p * 2]).filter((x) => x !== p).slice(0, 3).map((x) => `${x}%`), expl: `The passage states that attendance improved by ${p}%.`, tier: 1 },
        { stem: "What was the critics’ objection?", correct: "It reduced time for academic subjects", wrong: ["It increased absenteeism", "It made classes less disciplined", "It was too expensive for the school"], expl: "The critics argued that academic time was reduced." },
        { stem: "How did the principal answer the critics?", correct: "Better student focus compensated for the lost time", wrong: ["The period would soon be withdrawn", "Academic subjects were not important", "Teachers had demanded the change"], expl: "The principal’s reply is stated in the last sentence." },
        { stem: "Which of the following can be inferred from the passage?", correct: "Physical activity may support students’ engagement in class", wrong: ["Physical activity harms academic performance", "Attendance depends only on weather", "Teachers opposed the new period"], expl: "Better attendance and concentration were reported after the period began.", tier: 2 },
      ],
    };
  },
  (r) => {
    const city = pick(r, CITIES), t = pick(r, [1.2, 1.5, 1.8, 2.1, 2.4]), d = pick(r, [3, 4, 5]);
    return {
      passage: `Meteorologists in ${city} report that the average summer temperature has risen by ${t} °C in the last ${d} decades. They attribute the rise mainly to the loss of green cover and dense construction, which trap heat, and not to any change in rainfall, which has remained steady. Planners have been urged to protect existing trees and to include green spaces in every new housing project.`,
      qs: [
        { stem: "By how much has the average summer temperature risen?", correct: `${t} °C`, wrong: uniq([t + 0.3, t + 0.6, t - 0.3, t * 2]).filter((x) => x !== t && x > 0).slice(0, 3).map((x) => `${Math.round(x * 10) / 10} °C`), expl: `The passage states a rise of ${t} °C.`, tier: 1 },
        { stem: "Which factor is NOT blamed for the rise in temperature?", correct: "A change in rainfall", wrong: ["Loss of green cover", "Dense construction", "Heat trapped by buildings"], expl: "The passage specifically says rainfall has remained steady." },
        { stem: "What have planners been urged to do?", correct: "Protect trees and include green spaces in new housing projects", wrong: ["Stop all new construction permanently", "Reduce summer rainfall", "Stop measuring temperature"], expl: "This is stated in the last sentence." },
        { stem: "The tone of the passage is best described as", correct: "informative and cautionary", wrong: ["humorous and critical", "angry and accusatory", "nostalgic and sentimental"], expl: "It reports findings and urges action, which is an informative and cautionary tone.", tier: 2 },
      ],
    };
  },
];

export const comprehensionGen: QGen = (r, b) => {
  const fam = pick(r, FAMILIES);
  const { passage, qs } = fam(r);
  const q = pick(r, qs);
  if (q.wrong.length < 3) return null;
  const opts = shuffle(r, [q.correct, ...q.wrong.slice(0, 3)]);
  return mk({ ...b, tier: q.tier ?? 2 }, "Comprehension", "Reading comprehension", q.stem, {
    passage,
    options: opts,
    answer: opts.indexOf(q.correct),
    hint: ["Re-read the relevant sentence of the passage; the answer is stated or directly implied."],
    explanation: q.expl,
  });
};
