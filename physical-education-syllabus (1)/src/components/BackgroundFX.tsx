"use client";

import { useEffect, useRef } from "react";

/**
 * Fixed coffee background + a soft, reflective light that follows the pointer,
 * and one delegated listener that gives every `.glass-card` its tilt + sheen on hover.
 * Only transforms / CSS variables are touched so it stays smooth on weak devices.
 */
export default function BackgroundFX() {
  const shine = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    let raf = 0;
    let px = 0;
    let py = 0;
    let target: HTMLElement | null = null;
    let last: HTMLElement | null = null;
    let pe: PointerEvent | null = null;

    const reset = (el: HTMLElement | null) => {
      if (!el) return;
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--tx", "0px");
      el.style.setProperty("--ty", "0px");
    };

    const frame = () => {
      raf = 0;
      const s = shine.current;
      if (s) {
        s.style.transform = `translate3d(${px}px,${py}px,0)`;
        s.classList.add("on");
      }
      if (target && pe) {
        const rect = target.getBoundingClientRect();
        const x = pe.clientX - rect.left;
        const y = pe.clientY - rect.top;
        // Every box tilts a little towards the pointer. Wide boxes get a very small
        // angle and no lateral pull so buttons inside them never drift away.
        const wide = rect.width > 720;
        const amp = wide ? 0.3 : Math.min(1, Math.max(0.35, 460 / rect.width));
        target.style.setProperty("--mx", `${x}px`);
        target.style.setProperty("--my", `${y}px`);
        target.style.setProperty("--rx", `${((0.5 - y / rect.height) * 5 * amp).toFixed(2)}deg`);
        target.style.setProperty("--ry", `${((x / rect.width - 0.5) * 7 * amp).toFixed(2)}deg`);
        // gentle gravitational pull towards the pointer (small boxes only)
        target.style.setProperty("--tx", `${((x / rect.width - 0.5) * (amp ? 6 : 0)).toFixed(2)}px`);
        target.style.setProperty("--ty", `${((y / rect.height - 0.5) * (amp ? 5 : 0)).toFixed(2)}px`);
      }
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      px = e.clientX;
      py = e.clientY;
      pe = e;
      const t = (e.target as HTMLElement | null)?.closest?.(
        ".glass-card:not(.no-pop), .opt:not(:disabled), .btn:not(:disabled), .pill, .dd-item",
      ) as HTMLElement | null;
      if (t !== last) {
        reset(last);
        last = t;
      }
      target = t;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const leave = () => {
      shine.current?.classList.remove("on");
      reset(last);
      last = null;
      target = null;
    };

    document.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      document.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div className="bg-layer" aria-hidden />
      <div ref={shine} className="bg-shine" aria-hidden />
    </>
  );
}
