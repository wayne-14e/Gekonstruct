import { LESSON_LIMITS } from "@/lib/domain/lesson";

/**
 * Pure quiz + XP rules (BLUEPRINT §6/§7, unit-tested). The server action uses these so the
 * browser can never influence the score, and so the XP rules are testable without Firestore.
 */
export type GradableQuiz = ReadonlyArray<{ correctIndex: number }>;

export type QuizGrade = {
  correct: boolean[];
  correctCount: number;
  total: number;
  score: number;
  passed: boolean;
};

export function gradeQuiz(quiz: GradableQuiz, answers: readonly number[]): QuizGrade {
  const correct = quiz.map((question, index) => answers[index] === question.correctIndex);
  const correctCount = correct.filter(Boolean).length;
  const total = quiz.length;
  const score = total > 0 ? correctCount / total : 0;

  return {
    correct,
    correctCount,
    total,
    score,
    passed: total > 0 && score >= LESSON_LIMITS.passThreshold,
  };
}

/** Lesson XP is awarded once, and only for a first pass. */
export function lessonXpFor(input: {
  passedNow: boolean;
  alreadyPassed: boolean;
  lessonXp: number;
}): number {
  if (!input.passedNow || input.alreadyPassed) return 0;
  return input.lessonXp;
}

/** Pathway completion bonus: once per project, only when every lesson is passed. */
export function pathwayBonusFor(input: {
  alreadyAwarded: boolean;
  passedCount: number;
  totalLessons: number;
}): number {
  if (input.alreadyAwarded) return 0;
  if (input.totalLessons === 0) return 0;
  if (input.passedCount < input.totalLessons) return 0;
  return LESSON_LIMITS.pathwayBonus;
}

/** Local Geko reaction lines by score band (BLUEPRINT §8: no LLM call). */
export function gekoLineForScore(score: number): string {
  if (score >= 1) {
    return "Perfect score. You just proved you can explain this part of your own project.";
  }
  if (score >= LESSON_LIMITS.passThreshold) {
    return "That's a pass. You read your own code and got it right — that's the skill this pathway builds.";
  }
  return "Not yet — re-read the lesson and try again. Nothing is locked and no XP is lost.";
}
