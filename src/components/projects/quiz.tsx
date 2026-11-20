"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { SpeechBubble } from "@/components/brand/speech-bubble";
import { Button } from "@/components/ui/button";
import { completeLesson, type CompleteLessonResult } from "@/app/actions/lessons";
import type { PublicQuizQuestion } from "@/lib/domain/lesson";
import { cn } from "@/lib/utils";

/**
 * Client quiz (BLUEPRINT §9). It only receives questions and options — never the correct
 * indexes. The server action re-grades the answers against the stored lesson.
 */
export function Quiz({
  projectId,
  lessonId,
  quiz,
  xp,
  alreadyPassed,
  nextLesson,
}: {
  projectId: string;
  lessonId: string;
  quiz: PublicQuizQuestion[];
  xp: number;
  alreadyPassed: boolean;
  nextLesson: { id: string; title: string } | null;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Array<number | null>>(() => quiz.map(() => null));
  const [result, setResult] = useState<CompleteLessonResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answeredAll = answers.every((answer) => answer !== null);
  const locked = submitting || result?.ok === true;

  function choose(questionIndex: number, optionIndex: number) {
    if (locked) return;
    setAnswers((current) => current.map((value, index) => (index === questionIndex ? optionIndex : value)));
    setError(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;
    if (!answeredAll) {
      setError("Answer every question before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = await completeLesson({
        projectId,
        lessonId,
        answers: answers as number[],
      });
      setResult(payload);

      if (!payload.ok) {
        setError(payload.error);
        return;
      }

      if (payload.passed) {
        if (payload.xpAwarded > 0) {
          toast.success(`+${payload.xpAwarded} XP saved`);
        } else if (payload.alreadyPassed) {
          toast.success("Already passed — no XP is awarded twice.");
        } else {
          toast.success("Lesson passed");
        }
        if (payload.pathwayComplete && payload.bonusXp > 0) {
          toast.success(`Pathway complete: +${payload.bonusXp} bonus XP`);
        }
        if (payload.badgeAwarded) {
          toast.success("Badge unlocked: Foundation Builder", {
            description: "You passed every lesson in this pathway.",
          });
        }
      } else {
        toast.error("Not a pass yet — read the notes and try again.");
      }
      router.refresh();
    } catch {
      setError("We couldn't send your answers. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function retry() {
    setResult(null);
    setAnswers(quiz.map(() => null));
    setError(null);
  }

  const passed = result?.ok === true && result.passed;
  const outcome = result?.ok === true ? result : null;

  return (
    <section aria-labelledby="quiz-heading" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="label-mono">Check yourself</p>
          <h2 id="quiz-heading" className="mt-2 text-xl">
            Quiz · {quiz.length} questions
          </h2>
        </div>
        <span className="rounded-md border border-[#584211] bg-[#2b1f06] px-2 py-1 font-mono text-[0.6875rem] tracking-[0.06em] text-[#ffc53d] uppercase">
          +{xp} XP on first pass
        </span>
      </div>

      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {alreadyPassed
          ? "You already passed this lesson. You can retry any time; XP is only awarded once."
          : "Answer from memory. A pass needs at least 70%; a failed attempt costs nothing and can be retried immediately."}
      </p>

      <form onSubmit={submit} className="mt-5 space-y-4">
        {quiz.map((question, questionIndex) => {
          const review = outcome && outcome.correct[questionIndex] !== undefined ? outcome : null;
          return (
            <fieldset
              key={`${question.question}-${questionIndex}`}
              className="rounded-2xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <legend className="px-1 text-sm font-semibold leading-relaxed text-foreground">
                {questionIndex + 1}. {question.question}
              </legend>
              <div className="mt-3 space-y-2">
                {question.options.map((option, optionIndex) => {
                  const selected = answers[questionIndex] === optionIndex;
                  const isCorrect = review?.correctIndexes[questionIndex] === optionIndex;
                  const isChosenWrong = review?.correct[questionIndex] === false && selected;
                  return (
                    <label
                      key={`${option}-${optionIndex}`}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm leading-relaxed transition-colors",
                        selected
                          ? "border-primary/60 bg-[#0e2a1c] text-foreground"
                          : "border-border bg-[#0e141b] text-card-foreground hover:border-[#3a4b61]",
                        isCorrect && "border-primary/70 bg-[#0e2a1c]",
                        isChosenWrong && "border-destructive/50 bg-destructive/10",
                        locked && "cursor-default",
                      )}
                    >
                      <input
                        type="radio"
                        name={`question-${questionIndex}`}
                        value={optionIndex}
                        checked={selected}
                        onChange={() => choose(questionIndex, optionIndex)}
                        disabled={locked}
                        className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
                      />
                      <span className="min-w-0 flex-1">{option}</span>
                      {isCorrect ? (
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-label="Correct answer" />
                      ) : isChosenWrong ? (
                        <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Your answer" />
                      ) : null}
                    </label>
                  );
                })}
              </div>
              {review ? (
                <p className="mt-3 rounded-lg border-l-2 border-primary/70 bg-[#0e141b] px-3 py-2 text-sm leading-relaxed text-[#a9bccb]">
                  <span className="font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase">
                    Why
                  </span>
                  <span className="mt-1 block">{review.why[questionIndex]}</span>
                </p>
              ) : null}
            </fieldset>
          );
        })}

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p className="leading-relaxed">{error}</p>
          </div>
        ) : null}

        {outcome ? (
          <div aria-live="polite" className="rounded-2xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="label-mono">Result</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {outcome.correctCount} / {outcome.total} correct ·{" "}
                  {Math.round(outcome.score * 100)}%
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex h-7 items-center rounded-md border px-2 font-mono text-[0.6875rem] font-medium tracking-[0.06em] uppercase",
                  outcome.passed
                    ? "border-[#1e5033] bg-[#0e2a1c] text-[#8ce85f]"
                    : "border-destructive/30 bg-destructive/12 text-destructive",
                )}
              >
                {outcome.passed ? "Passed" : "Not yet"}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>
                {outcome.xpAwarded > 0 ? `+${outcome.xpAwarded} XP saved` : "No XP awarded this attempt"}
              </span>
              {outcome.bonusXp > 0 ? <span>+{outcome.bonusXp} pathway bonus</span> : null}
              <span className="font-mono text-xs">Total {outcome.totalXp.toLocaleString()} XP</span>
            </div>

            <SpeechBubble mood={outcome.passed ? "proud" : "encouraging"} className="mt-4" label="Geko">
              {outcome.gekoLine}
            </SpeechBubble>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {outcome.passed ? (
                nextLesson ? (
                  <Button asChild>
                    <Link href={`/projects/${projectId}/learn/${nextLesson.id}`}>
                      Next: {nextLesson.title}
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href={`/projects/${projectId}/learn`}>
                      Back to all lessons
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                )
              ) : (
                <Button type="button" onClick={retry}>
                  <RotateCcw aria-hidden="true" />
                  Try again
                </Button>
              )}
              {outcome.passed ? (
                <Button type="button" variant="outline" onClick={retry}>
                  Retry for review
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? "Checking…" : passed ? "Passed" : "Submit answers"}
            </Button>
            <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-muted-foreground uppercase">
              {quiz.length} questions · 70% to pass
            </p>
          </div>
        )}
      </form>
    </section>
  );
}
