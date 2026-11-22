import type { Question } from "@/lib/types";
import { mk, pick, randInt, shuffle, type Base, type RNG } from "./engine";
import { fmtN, numChoices } from "./quant";

type QGen = (r: RNG, b: Base) => Question | null;

const num = (r: RNG, kind: string, topic: string, stem: string, c: number, unit: string, hint: string, expl: string, tier: 1 | 2 | 3, b: Base, dec = 2): Question | null => {
  const ch = numChoices(r, c, (n) => `${fmtN(n)}${unit}`, dec);
  if (!ch) return null;
  return mk({ ...b, tier }, kind, topic, stem, { ...ch, hint: [hint], explanation: expl });
};

const cardiac: QGen = (r, b) => {
  const k = randInt(r, 0, 3);
  if (k === 0) {
    const hr = pick(r, [60, 70, 72, 80, 150, 180]), sv = pick(r, [60, 70, 80, 100, 120]);
    const c = (hr * sv) / 1000;
    return num(r, "Numerical problem", "Cardiac output", `An athlete has a heart rate of ${hr} beats/min and a stroke volume of ${sv} ml/beat. What is the cardiac output?`, c, " L/min", "Cardiac output = heart rate × stroke volume.", `${hr} × ${sv} = ${hr * sv} ml/min = ${fmtN(c)} L/min.`, 1, b);
  }
  if (k === 1) {
    const tv = pick(r, [400, 500, 600, 2000, 3000]), rr = pick(r, [12, 15, 16, 20, 40]);
    const c = (tv * rr) / 1000;
    return num(r, "Numerical problem", "Minute ventilation", `If the tidal volume is ${tv} ml and the breathing frequency is ${rr} breaths/min, what is the minute ventilation?`, c, " L/min", "Minute ventilation = tidal volume × breathing frequency.", `${tv} × ${rr} = ${tv * rr} ml/min = ${fmtN(c)} L/min.`, 1, b);
  }
  if (k === 2) {
    const age = pick(r, [18, 20, 25, 30, 40, 50]);
    return num(r, "Numerical problem", "Maximum heart rate", `Using the traditional formula, what is the estimated maximum heart rate of a ${age}-year-old person?`, 220 - age, " beats/min", "Maximum heart rate = 220 − age.", `220 − ${age} = ${220 - age} beats/min.`, 1, b, 0);
  }
  const max = pick(r, [190, 200, 180]), rest = pick(r, [60, 70, 50]), pct = pick(r, [60, 70, 80]);
  const c = ((max - rest) * pct) / 100 + rest;
  return num(r, "Numerical problem", "Karvonen formula", `An athlete’s maximum heart rate is ${max} and resting heart rate is ${rest} beats/min. Using the Karvonen formula, what is the target heart rate at ${pct}% intensity?`, c, " beats/min", "Target HR = (HRmax − HRrest) × intensity + HRrest.", `(${max} − ${rest}) × ${pct}/100 + ${rest} = ${fmtN(c)} beats/min.`, 3, b, 1);
};

const mech: QGen = (r, b) => {
  const k = randInt(r, 0, 4);
  if (k === 0) {
    const m = pick(r, [2, 5, 10, 60, 70, 80]), v = pick(r, [2, 4, 5, 8, 10]);
    return num(r, "Numerical problem", "Momentum", `What is the momentum of a body of mass ${m} kg moving at ${v} m/s?`, m * v, " kg·m/s", "Momentum = mass × velocity.", `${m} × ${v} = ${m * v} kg·m/s.`, 1, b, 0);
  }
  if (k === 1) {
    const f = pick(r, [20, 40, 50, 100, 200]), d = pick(r, [2, 3, 5, 10]);
    return num(r, "Numerical problem", "Work", `A force of ${f} N moves an object ${d} m in the direction of the force. How much work is done?`, f * d, " J", "Work = force × displacement.", `${f} × ${d} = ${f * d} J.`, 1, b, 0);
  }
  if (k === 2) {
    const w = pick(r, [600, 1000, 1200, 2400, 3000]), t = pick(r, [2, 3, 4, 5, 6]);
    if (w % t) return null;
    return num(r, "Numerical problem", "Power", `An athlete does ${w} J of work in ${t} seconds. What is the power output?`, w / t, " W", "Power = work ÷ time.", `${w} ÷ ${t} = ${w / t} W.`, 1, b, 0);
  }
  if (k === 3) {
    const f = pick(r, [50, 100, 200, 400]), t = pick(r, [0.1, 0.2, 0.5, 2]);
    return num(r, "Numerical problem", "Impulse", `A force of ${f} N acts on a ball for ${t} s. What is the impulse?`, f * t, " N·s", "Impulse = force × time.", `${f} × ${t} = ${fmtN(f * t)} N·s.`, 2, b);
  }
  const ea = pick(r, [20, 30, 40, 50]), ra = pick(r, [5, 10, 15, 20]);
  if (ea <= ra) return null;
  return num(r, "Numerical problem", "Mechanical advantage", `In a lever the effort arm is ${ea} cm and the resistance arm is ${ra} cm. What is the mechanical advantage?`, ea / ra, "", "Mechanical advantage = effort arm ÷ resistance arm.", `${ea} ÷ ${ra} = ${fmtN(ea / ra)}.`, 2, b);
};

const health: QGen = (r, b) => {
  const k = randInt(r, 0, 1);
  if (k === 0) {
    const h = pick(r, [1.5, 1.6, 1.65, 1.7, 1.75, 1.8]), w = pick(r, [50, 60, 64, 70, 80, 90]);
    const bmi = Math.round((w / (h * h)) * 10) / 10;
    return num(r, "Numerical problem", "BMI", `A person weighs ${w} kg and is ${h} m tall. What is the BMI (to one decimal place)?`, bmi, " kg/m²", "BMI = weight (kg) ÷ height² (m²).", `${w} ÷ (${h} × ${h}) = ${bmi} kg/m².`, 2, b, 1);
  }
  const c = pick(r, [200, 250, 300, 350]), p = pick(r, [60, 80, 100, 120]), f = pick(r, [20, 30, 40, 50]);
  return num(r, "Numerical problem", "Energy value of food", `A meal contains ${c} g carbohydrate, ${p} g protein and ${f} g fat. Taking 4, 4 and 9 kcal per gram respectively, what is its total energy value?`, c * 4 + p * 4 + f * 9, " kcal", "Multiply each nutrient’s grams by its energy value and add.", `${c}×4 + ${p}×4 + ${f}×9 = ${c * 4 + p * 4 + f * 9} kcal.`, 2, b, 0);
};

const train: QGen = (r, b) => {
  const k = randInt(r, 0, 1);
  if (k === 0) {
    const s = pick(r, [3, 4, 5]), rp = pick(r, [8, 10, 12]), l = pick(r, [20, 40, 60, 80]);
    return num(r, "Numerical problem", "Training volume", `An athlete performs ${s} sets of ${rp} repetitions with a load of ${l} kg. What is the total volume load?`, s * rp * l, " kg", "Volume load = sets × repetitions × load.", `${s} × ${rp} × ${l} = ${s * rp * l} kg.`, 1, b, 0);
  }
  const rm = pick(r, [80, 100, 120, 150, 200]), pct = pick(r, [60, 70, 75, 80, 90]);
  return num(r, "Numerical problem", "Training intensity", `An athlete’s one-repetition maximum (1RM) is ${rm} kg. What load corresponds to ${pct}% of the 1RM?`, (rm * pct) / 100, " kg", "Load = 1RM × percentage ÷ 100.", `${rm} × ${pct}/100 = ${fmtN((rm * pct) / 100)} kg.`, 1, b);
};

const stat: QGen = (r, b) => {
  const k = randInt(r, 0, 3);
  const xs = Array.from({ length: 5 }, () => randInt(r, 10, 40));
  if (k === 0) {
    const m = xs.reduce((s, x) => s + x, 0) / 5;
    return num(r, "Numerical problem", "Mean", `Find the mean of the scores: ${xs.join(", ")}.`, m, "", "Mean = sum of scores ÷ number of scores.", `${xs.join(" + ")} = ${xs.reduce((s, x) => s + x, 0)}; ÷ 5 = ${fmtN(m)}.`, 1, b);
  }
  if (k === 1) {
    const s = xs.slice().sort((a, c) => a - c);
    return num(r, "Numerical problem", "Median", `Find the median of the scores: ${xs.join(", ")}.`, s[2], "", "Arrange the scores in order and take the middle one.", `Ordered scores: ${s.join(", ")}; the middle score is ${s[2]}.`, 1, b, 0);
  }
  if (k === 2) {
    const s = xs.slice().sort((a, c) => a - c);
    const rg = s[4] - s[0];
    if (rg === 0) return null;
    return num(r, "Numerical problem", "Range", `Find the range of the scores: ${xs.join(", ")}.`, rg, "", "Range = highest score − lowest score.", `${s[4]} − ${s[0]} = ${rg}.`, 1, b, 0);
  }
  const M = pick(r, [50, 60, 70]), sd = pick(r, [5, 10]), x = M + sd * pick(r, [1, 2, 3]) ;
  return num(r, "Numerical problem", "Z-score", `A score of ${x} is obtained in a test with mean ${M} and standard deviation ${sd}. What is the Z-score?`, (x - M) / sd, "", "Z = (X − mean) ÷ SD.", `(${x} − ${M}) ÷ ${sd} = ${(x - M) / sd}.`, 2, b);
};

const tz: QGen = (r, b) => {
  const z = pick(r, [1, 2, -1, 0.5, 1.5]);
  const t = 50 + 10 * z;
  if (t <= 0) return null;
  return num(r, "Numerical problem", "T-score", `A student’s Z-score is ${z}. What is the corresponding T-score (mean 50, SD 10)?`, t, "", "T = 50 + 10 × Z.", `50 + 10 × ${z} = ${fmtN(t)}.`, 2, b);
};

const tour: QGen = (r, b) => {
  const n = randInt(r, 6, 24);
  const k = randInt(r, 0, 3);
  if (k === 0) return num(r, "Numerical problem", "Tournament fixtures", `How many matches are played in a single-league (round-robin) tournament of ${n} teams?`, (n * (n - 1)) / 2, "", "Matches = N(N − 1) ÷ 2.", `${n} × ${n - 1} ÷ 2 = ${(n * (n - 1)) / 2}.`, 2, b, 0);
  if (k === 1) return num(r, "Numerical problem", "Tournament fixtures", `How many matches are needed to decide the winner of a knockout tournament with ${n} teams?`, n - 1, "", "In a knockout tournament every match eliminates one team, so matches = N − 1.", `${n} − 1 = ${n - 1}.`, 1, b, 0);
  if (k === 2) {
    let p = 1;
    while (p < n) p *= 2;
    const byes = p - n;
    if (byes === 0) return null;
    return num(r, "Numerical problem", "Byes in knockout", `In a knockout tournament with ${n} teams, how many byes are required in the first round?`, byes, "", "Byes = next power of 2 − number of teams.", `The next power of 2 is ${p}; byes = ${p} − ${n} = ${byes}.`, 2, b, 0);
  }
  return num(r, "Numerical problem", "Tournament fixtures", `How many matches are played in a double-league tournament of ${n} teams?`, n * (n - 1), "", "Matches = N(N − 1) for a double league.", `${n} × ${n - 1} = ${n * (n - 1)}.`, 3, b, 0);
};

void shuffle;
export const P2_CALC: Record<number, QGen[]> = {
  2: [cardiac],
  3: [mech],
  6: [health],
  7: [train],
  8: [stat],
  9: [stat, tz],
  10: [tour],
};
