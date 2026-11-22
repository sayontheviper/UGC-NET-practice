/**
 * Brand mark for Sayon's UGC NET Practice site.
 * `variant="mark"` is the compact emblem used in the header and favicon;
 * `variant="full"` shows the complete illustrated logo (student-athlete with
 * clipboard, sport and science symbols and the SAYON ribbon).
 */
export default function Logo({ size = 44, variant = "mark" }: { size?: number; variant?: "mark" | "full" }) {
  if (variant === "full") {
    // cropped square emblem for compact placements
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={variant === "full" ? "/logo-mark.svg" : "/logo-sayon.svg"} width={size} height={size} alt="Sayon emblem" className="h-auto w-full max-w-full select-none" draggable={false} />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="Sayon" role="img">
      <defs>
        <linearGradient id="mk-bg" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#54341f" />
          <stop offset="1" stopColor="#160c07" />
        </linearGradient>
        <linearGradient id="mk-mint" x1="12" y1="10" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#cfeee0" />
          <stop offset="1" stopColor="#7fb199" />
        </linearGradient>
        <linearGradient id="mk-cream" x1="20" y1="18" x2="46" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f5ead6" />
          <stop offset="1" stopColor="#d9c3a0" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="18" fill="url(#mk-bg)" />
      <rect x="2.75" y="2.75" width="58.5" height="58.5" rx="17.25" stroke="url(#mk-mint)" strokeOpacity="0.7" strokeWidth="1.5" />
      {/* arc */}
      <circle cx="32" cy="30" r="21" stroke="#8fbfa8" strokeOpacity="0.55" strokeWidth="2.6" strokeDasharray="62 10 20 10" transform="rotate(-40 32 30)" fill="none" />
      {/* sprinter dot-trail */}
      <g stroke="#a6d4bd" strokeWidth="2.4" strokeLinecap="round" opacity="0.85">
        <circle cx="15.5" cy="22.5" r="2.4" fill="#a6d4bd" stroke="none" />
        <path d="M14 26.5 L18 29 L22 28" />
        <path d="M18 29 L16.5 33.5" />
        <path d="M18 29 L21.5 32" />
      </g>
      {/* head + hair */}
      <ellipse cx="35" cy="27" rx="7.4" ry="8.2" fill="url(#mk-cream)" />
      <path d="M27 25 c-1.5 -6 3 -10 8 -10 c5 -1 9 3 9 8 c0.5 3 -0.5 6 -2 8 c-1 -4 -4 -6 -8 -6 c-4 0 -6 2 -7 5 c-0.5 -1.5 -0.5 -3.5 0 -5 z" fill="#191009" />
      <circle cx="30" cy="18.5" r="3.4" fill="#191009" />
      <circle cx="35" cy="16.8" r="3.6" fill="#191009" />
      <circle cx="40" cy="18.8" r="3.2" fill="#191009" />
      <path d="M31.5 27 h3.4" stroke="#26362e" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      {/* jersey */}
      <path d="M24 42 c1.5 -4 6 -6 11 -6 c5 0 9.5 2 11 6 l1.6 8 h-25 z" fill="#1b1108" stroke="#8fbfa8" strokeOpacity="0.45" strokeWidth="1.2" />
      <path d="M25.5 40 l3 -2.5 l3 1 l-2.6 4 z" fill="#ebdcc2" opacity="0.9" />
      <path d="M43 40 l-3 -2.5 l-3 1 l2.6 4 z" fill="#ebdcc2" opacity="0.9" />
      {/* clipboard */}
      <g transform="rotate(-14 35 43)">
        <rect x="26.5" y="37.5" width="20" height="13" rx="2.4" fill="#100904" stroke="#e5d3b1" strokeWidth="1.5" />
        <g stroke="#e5d3b1" strokeWidth="1.1" strokeLinecap="round" opacity="0.6">
          <path d="M30 42 h13" />
          <path d="M30 44.6 h13" />
          <path d="M30 47.2 h9" />
        </g>
        <rect x="33.5" y="36" width="6" height="2.6" rx="1" fill="#e5d3b1" />
      </g>
      {/* ribbon */}
      <path d="M9 52.5 L14 50.5 L50 50.5 L56 53.5 L50 56.5 L14 56.5 L8 53.8 Z" fill="#120a05" stroke="#8fbfa8" strokeWidth="1.6" strokeLinejoin="round" />
      <text x="32" y="57" textAnchor="middle" fontFamily="Montserrat, Arial, sans-serif" fontSize="7.6" fontWeight="900" letterSpacing="1.1" fill="url(#mk-cream)">SAYON</text>
    </svg>
  );
}
