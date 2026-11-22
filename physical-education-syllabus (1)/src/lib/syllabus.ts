export interface UnitInfo {
  n: number;
  name: string;
  topics: string;
}

export interface PaperInfo {
  id: 1 | 2;
  name: string;
  code: string;
  tagline: string;
  units: UnitInfo[];
}

export const PAPERS: PaperInfo[] = [
  {
    id: 1,
    name: "General Paper",
    code: "Code 00 · Teaching & Research Aptitude",
    tagline: "Paper I · 50 questions · 100 marks",
    units: [
      { n: 1, name: "Teaching Aptitude", topics: "Levels of teaching, learner characteristics, methods, evaluation, CBCS" },
      { n: 2, name: "Research Aptitude", topics: "Types of research, methods, steps, thesis writing, ethics" },
      { n: 3, name: "Comprehension", topics: "Passage-based questions: inference, vocabulary, main idea" },
      { n: 4, name: "Communication", topics: "Types, barriers, classroom communication, mass media" },
      { n: 5, name: "Mathematical Reasoning & Aptitude", topics: "Series, codes, ratio, percentage, profit & loss, interest, averages" },
      { n: 6, name: "Logical Reasoning", topics: "Syllogism, fallacies, analogy, Indian logic, square of opposition" },
      { n: 7, name: "Data Interpretation", topics: "Tables, bar, line and pie charts, data and governance" },
      { n: 8, name: "ICT", topics: "Abbreviations, internet, e-mail, digital initiatives, ICT & governance" },
      { n: 9, name: "People, Development & Environment", topics: "SDGs, pollution, resources, hazards, treaties and acts" },
      { n: 10, name: "Higher Education System", topics: "Ancient institutions, policies, regulators, value education" },
    ],
  },
  {
    id: 2,
    name: "Physical Education",
    code: "Code 47 · Subject Paper",
    tagline: "Paper II · 100 questions · 200 marks",
    units: [
      { n: 1, name: "Foundations, Sociology & Olympics", topics: "History, philosophies, recreation, wellness, Olympic movement, sports bodies" },
      { n: 2, name: "Exercise Physiology", topics: "Muscle, energy systems, cardio-respiratory, fatigue, ergogenic aids" },
      { n: 3, name: "Kinesiology & Biomechanics", topics: "Planes, axes, levers, motion laws, projectiles, posture" },
      { n: 4, name: "Sports Psychology", topics: "Motivation, personality, anxiety, learning, group dynamics" },
      { n: 5, name: "Teacher Education & Curriculum", topics: "Professional courses, policies, curriculum, evaluation" },
      { n: 6, name: "Health, First-Aid & Nutrition", topics: "Health, diseases, first-aid, pollution, diet, substance abuse" },
      { n: 7, name: "Sports Training", topics: "Training load, motor abilities, periodization, technique, planning" },
      { n: 8, name: "Research & Statistics", topics: "Methods, hypotheses, sampling, tools, parametric & non-parametric tests" },
      { n: 9, name: "Test, Measurement & Evaluation", topics: "Fitness tests, skill tests, anthropometry, somatotype" },
      { n: 10, name: "Sports Management", topics: "Management, finance, facility, event, supervision, public relations" },
    ],
  },
];

export const getPaper = (id: number) => PAPERS.find((p) => p.id === id) ?? PAPERS[0];
export const getUnit = (paper: number, n: number) => getPaper(paper).units.find((u) => u.n === n);
