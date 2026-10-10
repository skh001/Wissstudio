"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui", display: "grid", placeItems: "center", minHeight: "100vh", background: "#FFFBFC", color: "#3B2A32" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 28 }}>The studio couldn&apos;t load</h1>
          <p style={{ color: "#8D7A83" }}>Check your connection, then reload.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "10px 20px", borderRadius: 999, border: 0, background: "#B76E79", color: "white" }}>
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
