"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Award, Check, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { SpeechBubble } from "@/components/brand/speech-bubble";
import { Button } from "@/components/ui/button";
import { completeDebugSession, type CompleteDebugSessionResult } from "@/app/actions/debug";
import type { PublicQuizQuestion } from "@/lib/domain/lesson";
import { cn } from "@/lib/utils";

/**
 * Client quiz for debug sessions (BLUEPRINT §8, §9).
 * Sends answers to server action `completeDebugSession` for validation.
 * Answers are never visible in the client DOM before submission.
 */
export function DebugQuiz({
  projectId,
  sessionId,
  quiz,
  xp,
  alreadyCompleted,
}: {
  projectId: string;
  sessionId: string;
  quiz: PublicQuizQuestion[];
  xp: number;
  alreadyCompleted: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Array<number | null>>(() => quiz.map(() => null));
  const [result, setResult] = useState<CompleteDebugSessionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answeredAll = answers.every((answer) => answer !== null);
  const locked = submitting || result?.ok === true;

  function choose(questionIndex: number, optionIndex: number) {
    if (locked) return;
    setAnswers((current) =>
      current.map((value, index) => (index === questionIndex ? optionIndex : value)),
    );
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
      const payload = await completeDebugSession({
        projectId,
        sessionId,
        answers: answers as number[],
      });
      setResult(payload);

      if (!payload.ok) {
        setError(payload.error);
        return;
      }

      if (payload.passed) {
        if (payload.xpAwarded > 0) {
          toast.success(`+${payload.xpAwarded} XP earned!`);
        } else if (payload.alreadyCompleted) {
          toast.success("Already completed — your XP is safe.");
        } else {
          toast.success("Debug quiz passed!");
        }

        if (payload.badgeAwarded) {
          toast.success("🏆 Badge Unlocked: Bug Whisperer!", {
            description: "Completed your first debug session.",
          });
        }
      } else {
        toast.error("Not quite — review the likely causes and try again.");
      }
      router.refresh();
    } catch {
      setError("We couldn't submit your answers. Check your connection and try again.");
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
    <section aria-labelledby="debug-quiz-heading" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="label-mono">Verify your understanding</p>
          <h2 id="debug-quiz-heading" className="mt-2 text-xl">
            Debug Quiz · {quiz.length} question{quiz.length > 1 ? "s" : ""}
          </h2>
        </div>
        <span className="rounded-md border border-[#584211] bg-[#2b1f06] px-2 py-1 font-mono text-[0.6875rem] tracking-[0.06em] text-[#ffc53d] uppercase">
          +{xp} XP on first completion
        </span>
      </div>

      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {alreadyCompleted
          ? "You already completed this debug session. Retesting is free — your XP is permanent."
          : "Verify you understand the underlying cause. Passing awards +30 XP and the Bug Whisperer badge on your first session."}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-6">
        {quiz.map((item, questionIndex) => {
          const selectedOption = answers[questionIndex];
          const isCorrectAnswer = outcome?.correct[questionIndex];
          const correctOptionIndex = outcome?.correctIndexes[questionIndex];

          return (
            <fieldset
              key={item.question}
              disabled={locked}
              className="rounded-2xl border border-border bg-card p-5 transition-colors sm:p-6"
            >
              <legend className="sr-only">Question {questionIndex + 1}</legend>
              <div className="flex items-start justify-between gap-3">
                <p className="label-mono text-muted-foreground">Question {questionIndex + 1}</p>
                {outcome ? (
                  isCorrectAnswer ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#1e5033] bg-[#0e2a1c] px-2 py-0.5 font-mono text-[0.6875rem] text-primary">
                      <Check className="size-3" aria-hidden="true" />
                      Correct
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#5a1c1c] bg-[#2c0f0f] px-2 py-0.5 font-mono text-[0.6875rem] text-[#ff7a70]">
                      <X className="size-3" aria-hidden="true" />
                      Incorrect
                    </span>
                  )
                ) : null}
              </div>

              <p className="mt-2 text-base font-medium text-foreground">{item.question}</p>

              <div className="mt-4 space-y-2">
                {item.options.map((option, optionIndex) => {
                  const isSelected = selectedOption === optionIndex;
                  const showAsCorrect = outcome && optionIndex === correctOptionIndex;
                  const showAsIncorrect = outcome && isSelected && !isCorrectAnswer;

                  return (
                    <button
                      type="button"
                      key={option}
                      onClick={() => choose(questionIndex, optionIndex)}
                      disabled={locked}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left text-sm transition-all",
                        isSelected
                          ? "border-primary bg-[#0e2a1c] text-foreground ring-1 ring-primary/40"
                          : "border-border bg-[#0e141b] text-muted-foreground hover:border-input hover:text-foreground",
                        showAsCorrect &&
                          "border-primary bg-[#0e2a1c] text-foreground ring-1 ring-primary",
                        showAsIncorrect && "border-[#ff7a70] bg-[#2c0f0f] text-[#ffb0a8]",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-md border font-mono text-[0.6875rem]",
                          isSelected
                            ? "border-primary bg-primary text-[#08140a]"
                            : "border-border bg-card text-muted-foreground",
                          showAsCorrect && "border-primary bg-primary text-[#08140a]",
                          showAsIncorrect && "border-[#ff7a70] bg-[#ff7a70] text-[#2c0f0f]",
                        )}
                        aria-hidden="true"
                      >
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span className="flex-1 leading-relaxed">{option}</span>
                    </button>
                  );
                })}
              </div>

              {outcome ? (
                <div className="mt-4 rounded-xl border border-border/80 bg-[#0e141b] p-3 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">Why: </span>
                  {outcome.why[questionIndex]}
                </div>
              ) : null}
            </fieldset>
          );
        })}

        {error ? (
          <div className="flex items-center gap-2 rounded-xl border border-[#5a1c1c] bg-[#2c0f0f] p-3 text-sm text-[#ff7a70]">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        ) : null}

        {outcome ? (
          <div className="space-y-4 pt-2">
            <SpeechBubble mood={passed ? "proud" : "encouraging"}>
              <p>{outcome.gekoLine}</p>
            </SpeechBubble>

            {outcome.badgeAwarded ? (
              <div className="flex items-center gap-3 rounded-2xl border border-[#584211] bg-[#2b1f06] p-4 text-[#ffd57a]">
                <Award className="size-6 text-[#ffc53d]" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Badge Unlocked: Bug Whisperer</p>
                  <p className="text-xs text-[#e8c060]">
                    You completed your first debug session and verified the root cause.
                  </p>
                </div>
              </div>
            ) : null}

            {!passed ? (
              <Button type="button" onClick={retry} variant="outline" className="gap-2">
                <RotateCcw className="size-4" aria-hidden="true" />
                Try again
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={!answeredAll || submitting} size="lg">
              {submitting ? "Checking answers..." : "Check my answers"}
            </Button>
          </div>
        )}
      </form>
    </section>
  );
}
