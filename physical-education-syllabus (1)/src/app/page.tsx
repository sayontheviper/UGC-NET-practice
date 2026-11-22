import Link from "next/link";
import { PAPERS } from "@/lib/syllabus";
import Logo from "@/components/Logo";

const FEATURES = [
  { icon: "💡", title: "Hints while you practise", text: "Reveal a nudge, then cross out a wrong option — explanations unlock once the session ends." },
  { icon: "🗂️", title: "Stacked flashcards", text: "Every session becomes a deck. Missed questions are saved to a revision deck automatically." },
  { icon: "📜", title: "10 years of PYQ-pattern papers", text: "June and December papers from 2016 to 2025, built on the official blueprint." },
  { icon: "✨", title: "Free AI generator", text: "Glyph Cluster, Pollinations, LLM7 and Puter — no API key, with difficulty control." },
  { icon: "🎯", title: "UGC NET question styles", text: "Statements, assertion–reason, match the following, sequencing, series, syllogisms and charts." },
  { icon: "☁️", title: "Sign in to save progress", text: "Sessions, mistakes and flashcards follow you across devices." },
];

export default function Home() {
  return (
    <div className="page">
      <section className="grid items-center gap-10 pt-4 sm:pt-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
        <div className="f-small t-mint mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--mint)]/35 bg-[var(--mint-soft)] px-4 py-1.5 text-xs">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--mint-bright)]" /> Updated syllabus · Paper I &amp; Paper II (Physical Education)
        </div>
        <h1 className="f-display max-w-4xl text-[clamp(2.4rem,7vw,5rem)]">
          Crack UGC NET with practice that feels{" "}
          <span style={{ color: "var(--mint-bright)" }}>effortless</span>.
        </h1>
        <p className="f-medium mt-5 max-w-2xl text-lg opacity-90">2,500+ questions per unit, hints, explanations, flashcards, ten years of PYQ-pattern papers and free AI question generation.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/practice" className="btn btn-mint !px-8 !py-3.5 text-base">
            Start practising →
          </Link>
          <Link href="/pyq" className="btn !px-8 !py-3.5 text-base">
            Try a PYQ paper
          </Link>
          <Link href="/ai" className="btn !px-8 !py-3.5 text-base">
            AI generator
          </Link>
        </div>
        </div>

        <div className="relative mx-auto w-full max-w-[400px]">
          <div className="float glass-card no-pop p-6" aria-hidden={false}>
            <Logo variant="full" size={360} />
          </div>
          <div className="f-small t-muted mt-3 text-center text-xs">Sayon · UGC NET practice for Paper I &amp; Paper II</div>
        </div>
      </section>

      <section className="mt-14 grid gap-5 md:grid-cols-2">
        {PAPERS.map((p, i) => (
          <Link key={p.id} href={`/practice?paper=${p.id}`} className="glass-card rise block p-7" style={{ ["--i" as string]: i }}>
            <div className="f-small t-mint text-xs uppercase tracking-wider">{p.code}</div>
            <h2 className="f-display mt-2 text-3xl">{p.name}</h2>
            <p className="f-small t-muted mt-1 text-sm">{p.tagline}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {p.units.map((u) => (
                <span key={u.n} className="f-small rounded-full border border-white/12 bg-black/20 px-3 py-1 text-xs">
                  {u.n}. {u.name}
                </span>
              ))}
            </div>
            <div className="f-medium t-mint mt-6 text-sm">Practise this paper →</div>
          </Link>
        ))}
      </section>

      <section className="mt-14">
        <h2 className="f-display text-3xl">Everything you need to revise</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="glass-card rise p-6" style={{ ["--i" as string]: i }}>
              <div className="text-3xl">{f.icon}</div>
              <div className="f-display mt-3 text-lg">{f.title}</div>
              <p className="f-small t-muted mt-1 text-sm leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
