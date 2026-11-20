"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import type * as Monaco from "monaco-editor";
import { ExternalLink, Files } from "lucide-react";
import type { LessonDoc, PublicQuizQuestion } from "@/lib/domain/lesson";
import type { SnapshotFile } from "@/lib/domain/project";
import { LessonMarkdown } from "@/components/projects/lesson-markdown";
import { Quiz } from "@/components/projects/quiz";
import { SpeechBubble } from "@/components/brand/speech-bubble";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

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

export function FoundationWorkspace({
  projectId,
  repoUrl,
  lesson,
  lessons,
  position,
  snapshotFiles,
  quiz,
  xp,
  alreadyPassed,
  nextLesson,
}: {
  projectId: string;
  repoUrl: string;
  lesson: LessonDoc;
  lessons: LessonDoc[];
  position: number;
  snapshotFiles: SnapshotFile[];
  quiz: PublicQuizQuestion[];
  xp: number;
  alreadyPassed: boolean;
  nextLesson: { id: string; title: string } | null;
}) {
  const workspaceFiles = useMemo(() => {
    if (position === lessons.length - 1) return snapshotFiles;

    const allowed = new Set<string>();
    lessons.slice(0, position + 1).forEach((item) => {
      item.codeRefs.forEach((ref) => allowed.add(ref.file));
    });

    return snapshotFiles.filter((file) => allowed.has(file.path));
  }, [lessons, position, snapshotFiles]);

  const [activePath, setActivePath] = useState(workspaceFiles[0]?.path ?? "");
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const decorations = useRef<string[]>([]);
  const activeFile = workspaceFiles.find((file) => file.path === activePath) ?? workspaceFiles[0];



  function highlightConcept(editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) {
    if (!activeFile) return;
    const lineCount = activeFile.content.split("\n").length;
    const start = Math.min(Math.max(Math.floor(lineCount / 3), 1), lineCount);
    const end = Math.min(start + 7, lineCount);
    decorations.current = editor.deltaDecorations(decorations.current, [
      {
        range: new monaco.Range(start, 1, end, 1),
        options: {
          isWholeLine: true,
          className: "geko-guided-line",
          glyphMarginClassName: "geko-guided-glyph",
        },
      },
    ]);
    editor.revealLineInCenter(start);
  }

  return (
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div className="min-w-0">
        <section aria-labelledby="goal-heading" className="rounded-2xl border border-border bg-card p-5">
          <p className="label-mono">After this lesson you can</p>
          <p id="goal-heading" className="mt-2 text-sm leading-relaxed text-card-foreground">
            {lesson.goal}
          </p>
        </section>

        <article aria-labelledby="explain-heading" className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 id="explain-heading" className="text-lg">Read the concept</h2>
          <div className="mt-4">
            <LessonMarkdown text={lesson.explain} />
          </div>
        </article>

        <SpeechBubble mood={alreadyPassed ? "proud" : "encouraging"} className="mt-5" label="Geko">
          {lesson.gekoTip}
        </SpeechBubble>

        <Quiz
          projectId={projectId}
          lessonId={lesson.id}
          quiz={quiz}
          xp={xp}
          alreadyPassed={alreadyPassed}
          nextLesson={nextLesson}
        />
      </div>

      <aside className="min-w-0 lg:sticky lg:top-20" aria-label="Lesson code workspace">
        <div className="overflow-hidden rounded-2xl border border-border bg-[#0e141b]">
          <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <Files className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate font-mono text-[0.6875rem] text-[#a9bccb]">
                  {position === lessons.length - 1
                    ? "Full codebase"
                    : `${workspaceFiles.length} ${workspaceFiles.length === 1 ? "file" : "files"} unlocked`}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Lesson {position + 1} of {lessons.length}
                </p>
              </div>
            </div>
            {activeFile ? (
              <a
                href={`${repoUrl}/blob/HEAD/${activeFile.path}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                GitHub
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            ) : null}
          </div>

          {workspaceFiles.length > 1 ? (
            <div className="flex max-w-full overflow-x-auto border-b border-border bg-[#090d12]">
              {workspaceFiles.map((file) => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setActivePath(file.path)}
                  className={
                    activeFile?.path === file.path
                      ? "h-9 max-w-52 shrink-0 border-r border-primary/50 bg-[#111820] px-3 font-mono text-[0.6875rem] text-primary"
                      : "h-9 max-w-52 shrink-0 border-r border-border px-3 font-mono text-[0.6875rem] text-muted-foreground hover:text-foreground"
                  }
                  title={file.path}
                >
                  <span className="block truncate">{file.path}</span>
                </button>
              ))}
            </div>
          ) : null}

          {activeFile ? (
            <Editor
              key={activeFile.path}
              height="680px"
              language={languageForPath(activeFile.path)}
              theme="geko-dark"
              value={activeFile.content.slice(0, 12_000)}
              beforeMount={(monaco) => {
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
              }}
              onMount={(editor) => {
                editorRef.current = editor;
                if (monacoRef.current) highlightConcept(editor, monacoRef.current);
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
          ) : (
            <div className="grid h-[680px] place-items-center px-6 text-center text-sm text-muted-foreground">
              This lesson has no unlocked code files yet.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
