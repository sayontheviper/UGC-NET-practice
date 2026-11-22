export type Visual =
  | { kind: "table"; title?: string; head: string[]; rows: (string | number)[][] }
  | { kind: "bar"; title?: string; labels: string[]; series: { name: string; values: number[] }[]; unit?: string }
  | { kind: "line"; title?: string; labels: string[]; series: { name: string; values: number[] }[]; unit?: string }
  | { kind: "pie"; title?: string; labels: string[]; values: number[] }
  | { kind: "match"; title?: string; leftHead: string; rightHead: string; left: string[]; right: string[] };

export interface Question {
  id: string;
  paper: 1 | 2;
  unit: number;
  kind: string;
  topic: string;
  difficulty: 1 | 2 | 3;
  passage?: string;
  stem: string;
  lines?: string[];
  visual?: Visual;
  options: string[];
  answer: number;
  hint: string[];
  explanation: string;
  /** dedupe key used to avoid repeats across sessions */
  key: string;
  source?: string;
}

export type Difficulty = "easy" | "medium" | "hard" | "mixed";

export interface AttemptRecord {
  id: string;
  title: string;
  mode: string;
  paper: number;
  score: number;
  total: number;
  createdAt: string;
  detail?: unknown;
}

export interface UserData {
  seen: string[]; // question keys already practised
  mistakes: Question[]; // questions answered wrong at some point (for flashcards)
  cards: Question[]; // flashcards from the last session
}
