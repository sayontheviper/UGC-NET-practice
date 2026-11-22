"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";
import { useApp } from "@/components/Providers";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/practice", label: "Practice" },
  { href: "/pyq", label: "PYQ Papers" },
  { href: "/ai", label: "AI Generator" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/progress", label: "Progress" },
];

function Avatar() {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sayon_photo");
      if (saved) {
        setSrc(saved);
        setFailed(false);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function onFile(f: File | undefined) {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const s = 192;
        const c = document.createElement("canvas");
        c.width = s;
        c.height = s;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        const m = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
        const url = c.toDataURL("image/jpeg", 0.85);
        try {
          localStorage.setItem("sayon_photo", url);
        } catch {
          /* ignore */
        }
        setSrc(url);
        setFailed(false);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(f);
  }

  return (
    <>
      <button
        onClick={() => fileRef.current?.click()}
        title="Click to set your photo"
        aria-label="Profile photo"
        className="group relative h-11 w-11 flex-none overflow-hidden rounded-full border border-[var(--mint)]/60 shadow-[0_0_0_3px_rgba(143,191,168,0.12)] transition-transform duration-500 [transition-timing-function:var(--spring)] hover:scale-110"
      >
        {src && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Sayon" className="h-full w-full object-cover" onError={() => setFailed(true)} />
        ) : (
          <span className="f-display grid h-full w-full place-items-center bg-gradient-to-br from-[#5a3a26] to-[#24140c] text-lg">S</span>
        )}
        <span className="absolute inset-0 grid place-items-center bg-black/55 text-[10px] opacity-0 transition-opacity group-hover:opacity-100">Edit</span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
    </>
  );
}

export default function Header() {
  const pathname = usePathname();
  const { user, openAuth, logout, accounts } = useApp();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [lens, setLens] = useState<{ x: number; w: number; on: boolean }>({ x: 0, w: 0, on: false });
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menu]);

  function hover(el: HTMLElement) {
    setLens({ x: el.offsetLeft, w: el.offsetWidth, on: true });
  }

  return (
    <header className="glass-header">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link
          href="/"
          title="Sayon's UGC NET Practice site"
          className="group flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-[14px] border border-[var(--mint)]/45 bg-[#1d100a] shadow-[0_6px_18px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] transition-transform duration-500 [transition-timing-function:var(--spring)] hover:scale-105"
        >
          <span className="block w-[52px] transition-transform duration-500 group-hover:scale-110">
            <Logo variant="full" size={52} />
          </span>
        </Link>
        <Avatar />
        <Link href="/" className="min-w-0 flex-1">
          <span className="f-display block text-[1.05rem] leading-tight sm:text-xl md:text-[1.5rem]">Sayon&apos;s UGC NET Practice site</span>
          <span className="f-small t-muted hidden text-xs md:block">General Paper · Physical Education · PYQs · AI practice</span>
        </Link>

        <div className="order-3 w-full overflow-x-auto no-scrollbar">
          <div ref={wrapRef} className="nav-wrap mx-auto w-max" onMouseLeave={() => setLens((l) => ({ ...l, on: false }))}>
            <span className={`nav-lens ${lens.on ? "on" : ""}`} style={{ transform: `translate3d(${lens.x}px,0,0)`, width: lens.w }} />
            {NAV.map((n) => {
              const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} className={`nav-link ${active ? "active" : ""}`} onMouseEnter={(e) => hover(e.currentTarget)} onFocus={(e) => hover(e.currentTarget)}>
                  {n.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="relative ml-auto flex flex-none items-center gap-2">
          {user ? (
            <>
              <button
                className="btn !px-4 !py-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenu((m) => !m);
                }}
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--mint)] text-xs text-[#12261c]">{user.name.slice(0, 1).toUpperCase()}</span>
                <span className="hidden max-w-[110px] truncate sm:inline">{user.name}</span>
              </button>
              {menu && (
                <div className="menu-panel glass-card no-pop absolute right-0 top-12 z-50 w-56 p-3" onClick={(e) => e.stopPropagation()}>
                  <div className="f-small t-muted px-2 pb-2 text-xs">Signed in as</div>
                  <div className="f-medium truncate px-2 pb-3 text-sm">{user.email}</div>
                  <button
                    className="btn w-full !py-2"
                    onClick={async () => {
                      setMenu(false);
                      await logout();
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </>
          ) : !accounts ? (
            <span
              className="f-small t-muted rounded-full border border-white/12 px-3 py-2 text-xs"
              title="This deployment has no database, so accounts are disabled. Progress is saved in your browser."
            >
              Guest mode
            </span>
          ) : (
            <>
              <button className="btn !px-4 !py-2" onClick={() => openAuth("login")}>
                Sign in
              </button>
              <button className="btn btn-mint !px-4 !py-2" onClick={() => openAuth("signup")}>
                Sign up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
