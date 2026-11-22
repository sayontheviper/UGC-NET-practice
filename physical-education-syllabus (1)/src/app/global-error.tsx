"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#1c100a", color: "#ebdcc2", fontFamily: "Arial, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>Sayon&apos;s UGC NET Practice site</h1>
          <p style={{ color: "#bfb2a0", marginBottom: 20 }}>Something went wrong while loading the app.</p>
          <button
            onClick={reset}
            style={{ background: "#a6d4bd", color: "#12261c", border: 0, borderRadius: 14, padding: "12px 22px", fontWeight: 700, cursor: "pointer" }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
