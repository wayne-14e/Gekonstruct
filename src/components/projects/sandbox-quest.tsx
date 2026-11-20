"use client";

import { Sandpack } from "@codesandbox/sandpack-react";
import { useState } from "react";
import { Check, RotateCcw, Trophy } from "lucide-react";

export function SandboxQuest({
  title,
  initialCode,
  language,
}: {
  title: string;
  initialCode: string;
  language: string;
}) {
  const [solved, setSolved] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const isHtml = language === "html";

  const files = isHtml
    ? {
        "/index.html": `<!doctype html>
<html>
  <body>
${initialCode.slice(0, 4_000)}
  </body>
</html>`,
        "/styles.css": `body { font-family: system-ui; background: #090d12; color: #ecf3ef; padding: 24px; }
button { background: #5be000; color: #091007; border: 0; border-radius: 8px; padding: 10px 14px; font-weight: 700; }`,
      }
    : {
        "/App.js": `export default function App() {
  return (
    <main style={{ fontFamily: "system-ui", background: "#090d12", color: "#ecf3ef", minHeight: "100vh", padding: 24 }}>
      <h1>Break & Fix</h1>
      <pre style={{ whiteSpace: "pre-wrap" }}>${initialCode.replace(/`/g, "\\`").slice(0, 4_000)}</pre>
    </main>
  );
}`,
      };

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-mono">Break & Fix sandbox</p>
          <h2 className="mt-1 text-lg">{title}</h2>
        </div>
        {solved ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-[#1e5033] bg-[#0e2a1c] px-2 py-1 font-mono text-xs text-primary">
            <Trophy className="size-3" aria-hidden="true" />
            Mission complete
          </span>
        ) : null}
      </div>

      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Change the code, use the preview, and confirm the behavior in plain language before marking the mission solved.
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        <Sandpack
          key={resetKey}
          template={isHtml ? "static" : "react"}
          theme="dark"
          files={files}
          options={{
            editorHeight: 380,
            showTabs: true,
            showInlineErrors: true,
            showNavigator: false,
          }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSolved(true)}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          <Check className="size-4" aria-hidden="true" />
          I fixed the behavior
        </button>
        <button
          type="button"
          onClick={() => {
            setSolved(false);
            setResetKey((key) => key + 1);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Reset mission
        </button>
      </div>
    </section>
  );
}
