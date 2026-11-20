"use client";

import Editor, { type BeforeMount } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import type * as Monaco from "monaco-editor";

type CodeRef = { file: string; content: string; note: string };

function languageForPath(path: string): string {
  if (/\.tsx?$/.test(path)) return "typescript";
  if (/\.jsx?$/.test(path)) return "javascript";
  if (/\.json$/.test(path)) return "json";
  if (/\.css$/.test(path)) return "css";
  if (/\.ya?ml$/.test(path)) return "yaml";
  if (/\.md$/.test(path)) return "markdown";
  if (/\.py$/.test(path)) return "python";
  if (/\.go$/.test(path)) return "go";
  if (/\.rs$/.test(path)) return "rust";
  if (/\.html$/.test(path)) return "html";
  return "plaintext";
}

export default function MonacoTour({
  codeRefs,
  repoUrl,
}: {
  codeRefs: CodeRef[];
  repoUrl: string;
}) {
  const [refIndex, setRefIndex] = useState(0);
  const decorations = useRef<string[]>([]);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const ref = codeRefs[refIndex];

  const beforeMount: BeforeMount = (monaco) => {
    monacoRef.current = monaco;
    monaco.editor.defineTheme("geko-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#0e141b",
        "editor.lineHighlightBackground": "#102116",
        "editor.selectionBackground": "#1f5033",
      },
    });
  };

  const highlight = () => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !ref) return;

    const lines = ref.content.split("\n");
    const middle = Math.min(Math.max(Math.floor(lines.length / 3), 1), lines.length);
    decorations.current = editor.deltaDecorations(decorations.current, [
      {
        range: new monaco.Range(middle, 1, Math.min(middle + 8, lines.length), 1),
        options: {
          isWholeLine: true,
          className: "geko-guided-line",
          glyphMarginClassName: "geko-guided-glyph",
        },
      },
    ]);
    editor.revealLineInCenter(middle);
  };

  useEffect(() => {
    const timer = window.setTimeout(highlight, 50);
    return () => window.clearTimeout(timer);
  });

  if (!ref) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-[#0e141b] px-3 py-2">
        <span className="truncate font-mono text-xs text-[#a9bccb]">{ref.file}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.625rem] text-muted-foreground">
            {refIndex + 1}/{codeRefs.length}
          </span>
          <a
            href={`${repoUrl}/blob/HEAD/${ref.file}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary"
          >
            GitHub
          </a>
        </div>
      </div>
      <Editor
        height="300px"
        language={languageForPath(ref.file)}
        theme="geko-dark"
        value={ref.content.slice(0, 12_000)}
        beforeMount={beforeMount}
        onMount={(editor) => {
          editorRef.current = editor;
          highlight();
        }}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          glyphMargin: true,
          lineNumbersMinChars: 3,
          scrollBeyondLastLine: false,
          folding: false,
          automaticLayout: true,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 12,
          padding: { top: 12, bottom: 12 },
        }}
      />
      <div className="flex items-center justify-between gap-3 border-t border-border bg-[#0e141b] px-3 py-2">
        <p className="text-xs leading-relaxed text-muted-foreground">{ref.note}</p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setRefIndex((index) => Math.max(0, index - 1))}
            disabled={refIndex === 0}
            className="h-8 rounded-md border border-border px-2 text-xs disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setRefIndex((index) => Math.min(codeRefs.length - 1, index + 1))}
            disabled={refIndex === codeRefs.length - 1}
            className="h-8 rounded-md bg-primary px-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
          >
            Next file
          </button>
        </div>
      </div>
    </div>
  );
}
