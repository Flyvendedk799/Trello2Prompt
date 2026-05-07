"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body style={{ fontFamily: "system-ui", padding: "2rem" }}>
        <h1>Something went wrong</h1>
        <pre style={{ whiteSpace: "pre-wrap", color: "#b91c1c" }}>{error.message}</pre>
        <button onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem", cursor: "pointer" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
