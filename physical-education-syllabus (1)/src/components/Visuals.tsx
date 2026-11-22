"use client";

import type { Question, Visual } from "@/lib/types";

const PALETTE = ["#8fbfa8", "#e0b98a", "#c9826b", "#a99bc4", "#d7d0a0"];

function niceMax(v: number) {
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p / 2) * p * 2 > v * 1.4 ? Math.ceil(v / p) * p : Math.ceil(v / (p / 2)) * (p / 2);
}

function Axis({ max, w, h, pad }: { max: number; w: number; h: number; pad: { l: number; t: number; b: number; r: number } }) {
  return (
    <g>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = pad.t + (h - pad.t - pad.b) * (1 - f);
        return (
          <g key={f}>
            <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="rgba(255,240,220,0.12)" />
            <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#bfb2a0">
              {Math.round(max * f)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Legend({ names }: { names: string[] }) {
  return (
    <div className="f-small mt-2 flex flex-wrap gap-4 text-xs">
      {names.map((n, i) => (
        <span key={n} className="inline-flex items-center gap-2">
          <i className="inline-block h-3 w-3 rounded-sm" style={{ background: PALETTE[i] }} />
          {n}
        </span>
      ))}
    </div>
  );
}

function Bar({ v }: { v: Extract<Visual, { kind: "bar" }> }) {
  const w = 540, h = 270, pad = { l: 38, t: 16, b: 30, r: 10 };
  const max = niceMax(Math.max(...v.series.flatMap((s) => s.values)));
  const gw = (w - pad.l - pad.r) / v.labels.length;
  const bw = Math.min(26, (gw - 12) / v.series.length);
  return (
    <>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-xl">
        <Axis max={max} w={w} h={h} pad={pad} />
        {v.labels.map((lb, i) => (
          <g key={lb}>
            {v.series.map((s, si) => {
              const bh = ((h - pad.t - pad.b) * s.values[i]) / max;
              const x = pad.l + gw * i + (gw - bw * v.series.length) / 2 + si * bw;
              return (
                <g key={s.name}>
                  <rect x={x} y={h - pad.b - bh} width={bw - 2} height={bh} rx="3" fill={PALETTE[si]} />
                  <text x={x + bw / 2 - 1} y={h - pad.b - bh - 4} textAnchor="middle" fontSize="9" fill="#eee7dc">
                    {s.values[i]}
                  </text>
                </g>
              );
            })}
            <text x={pad.l + gw * i + gw / 2} y={h - 10} textAnchor="middle" fontSize="11" fill="#eee7dc">
              {lb}
            </text>
          </g>
        ))}
      </svg>
      <Legend names={v.series.map((s) => s.name)} />
    </>
  );
}

function Line({ v }: { v: Extract<Visual, { kind: "line" }> }) {
  const w = 540, h = 250, pad = { l: 38, t: 20, b: 30, r: 16 };
  const max = niceMax(Math.max(...v.series.flatMap((s) => s.values)));
  const step = (w - pad.l - pad.r) / (v.labels.length - 1);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-xl">
      <Axis max={max} w={w} h={h} pad={pad} />
      {v.series.map((s, si) => {
        const pts = s.values.map((val, i) => [pad.l + step * i, h - pad.b - ((h - pad.t - pad.b) * val) / max] as const);
        return (
          <g key={s.name}>
            <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={PALETTE[si]} strokeWidth="2.5" strokeLinejoin="round" />
            {pts.map((p, i) => (
              <g key={i}>
                <circle cx={p[0]} cy={p[1]} r="4" fill="#2a1810" stroke={PALETTE[si]} strokeWidth="2" />
                <text x={p[0]} y={p[1] - 10} textAnchor="middle" fontSize="10" fill="#eee7dc">
                  {s.values[i]}
                </text>
              </g>
            ))}
          </g>
        );
      })}
      {v.labels.map((lb, i) => (
        <text key={lb} x={pad.l + step * i} y={h - 10} textAnchor="middle" fontSize="11" fill="#eee7dc">
          {lb}
        </text>
      ))}
    </svg>
  );
}

function Pie({ v }: { v: Extract<Visual, { kind: "pie" }> }) {
  const total = v.values.reduce((s, x) => s + x, 0);
  let acc = 0;
  const R = 90;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="-100 -100 200 200" className="h-48 w-48">
        {v.values.map((val, i) => {
          const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2;
          acc += val;
          const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2;
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const d = `M0 0 L${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 ${large} 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)}Z`;
          return <path key={i} d={d} fill={PALETTE[i % PALETTE.length]} stroke="#2a1810" strokeWidth="2" />;
        })}
      </svg>
      <ul className="f-small grid gap-1.5 text-sm">
        {v.labels.map((l, i) => (
          <li key={l} className="flex items-center gap-2">
            <i className="inline-block h-3 w-3 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
            {l} — <b className="f-medium">{v.values[i]}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VisualView({ v }: { v: Visual }) {
  return (
    <div className="my-4 rounded-2xl border border-white/10 bg-black/20 p-4">
      {"title" in v && v.title && <div className="f-medium mb-3 text-sm">{v.title}</div>}
      {v.kind === "table" && (
        <div className="overflow-x-auto">
          <table className="f-small w-full min-w-[320px] border-collapse text-sm">
            <thead>
              <tr>
                {v.head.map((h, i) => (
                  <th key={i} className="f-medium border-b border-white/15 px-3 py-2 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {v.rows.map((row, i) => (
                <tr key={i} className="odd:bg-white/[0.03]">
                  {row.map((c, j) => (
                    <td key={j} className={`px-3 py-2 ${j === 0 ? "f-medium" : ""}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {v.kind === "bar" && <Bar v={v} />}
      {v.kind === "line" && <Line v={v} />}
      {v.kind === "pie" && <Pie v={v} />}
      {v.kind === "match" && (
        <div className="f-small grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="f-medium t-mint mb-2">{v.leftHead}</div>
            {v.left.map((t, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <b className="f-medium w-5 flex-none">{"ABCD"[i]}.</b>
                <span>{t}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="f-medium t-mint mb-2">{v.rightHead}</div>
            {v.right.map((t, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <b className="f-medium w-5 flex-none">{i + 1}.</b>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** passage + stem + statements + visual of a question (no options) */
export function QuestionBody({ q }: { q: Question }) {
  return (
    <div>
      {q.passage && (
        <div className="f-small mb-4 rounded-2xl border border-[var(--mint)]/25 bg-[var(--mint-soft)] p-4 text-[0.95rem] leading-relaxed">
          <div className="f-medium t-mint mb-1 text-xs uppercase tracking-wider">Passage</div>
          {q.passage}
        </div>
      )}
      <p className="f-medium whitespace-pre-line text-[1.05rem] leading-relaxed">{q.stem}</p>
      {q.lines && (
        <ul className="f-small mt-3 grid gap-2 text-[0.95rem] leading-relaxed">
          {q.lines.map((l, i) => (
            <li key={i} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              {l}
            </li>
          ))}
        </ul>
      )}
      {q.visual && <VisualView v={q.visual} />}
    </div>
  );
}
