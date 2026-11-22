import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import BackgroundFX from "@/components/BackgroundFX";

export const metadata: Metadata = {
  title: "Sayon's UGC NET Practice site",
  description: "UGC NET practice for the General Paper (Paper I) and Physical Education (Paper II): hints, flashcards, PYQ papers and free AI question generation.",
  icons: { icon: "/logo-sayon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#1c100a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Montserrat is the closest open substitute for Nexa Heavy / Gotham Bold when those licensed fonts are not installed */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <BackgroundFX />
        <Providers>
          <Header />
          <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-8">{children}</main>
          <footer className="f-small t-muted relative z-10 pb-10 text-center text-xs">Sayon&apos;s UGC NET Practice site · Built for Paper I (Code 00) &amp; Paper II Physical Education (Code 47)</footer>
        </Providers>
      </body>
    </html>
  );
}
