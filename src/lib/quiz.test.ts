import { describe, expect, it } from "vitest";
import { LESSON_LIMITS } from "@/lib/domain/lesson";
import { gekoLineForScore, gradeQuiz, lessonXpFor, pathwayBonusFor } from "@/lib/quiz";

const QUIZ = [{ correctIndex: 1 }, { correctIndex: 0 }, { correctIndex: 2 }];

describe("gradeQuiz", () => {
  it("passes at 70% or more", () => {
    const grade = gradeQuiz(QUIZ, [1, 0, 2]);
    expect(grade.correct).toEqual([true, true, true]);
    expect(grade.correctCount).toBe(3);
    expect(grade.score).toBe(1);
    expect(grade.passed).toBe(true);
  });

  it("fails below 70% with per-question feedback", () => {
    const grade = gradeQuiz(QUIZ, [1, 2, 0]);
    expect(grade.correct).toEqual([true, false, false]);
    expect(grade.correctCount).toBe(1);
    expect(grade.score).toBeCloseTo(1 / 3);
    expect(grade.passed).toBe(false);
  });

  it("fails an unanswered-style wrong answer rather than throwing", () => {
    const grade = gradeQuiz([{ correctIndex: 0 }, { correctIndex: 1 }], [0, 0]);
    expect(grade.correct).toEqual([true, false]);
    expect(grade.passed).toBe(false);
  });

  it("never passes an empty quiz", () => {
    const grade = gradeQuiz([], []);
    expect(grade.total).toBe(0);
    expect(grade.passed).toBe(false);
  });
});

describe("lessonXpFor", () => {
  it("awards the lesson XP on a first pass", () => {
    expect(lessonXpFor({ passedNow: true, alreadyPassed: false, lessonXp: 20 })).toBe(20);
  });

  it("awards nothing on a fail or a retake of a passed lesson", () => {
    expect(lessonXpFor({ passedNow: false, alreadyPassed: false, lessonXp: 20 })).toBe(0);
    expect(lessonXpFor({ passedNow: true, alreadyPassed: true, lessonXp: 20 })).toBe(0);
  });
});

describe("pathwayBonusFor", () => {
  it("awards the bonus once when every lesson is passed", () => {
    expect(
      pathwayBonusFor({ alreadyAwarded: false, passedCount: 6, totalLessons: 6 }),
    ).toBe(LESSON_LIMITS.pathwayBonus);
  });

  it("awards nothing before completion or after the bonus was claimed", () => {
    expect(pathwayBonusFor({ alreadyAwarded: false, passedCount: 5, totalLessons: 6 })).toBe(0);
    expect(pathwayBonusFor({ alreadyAwarded: true, passedCount: 6, totalLessons: 6 })).toBe(0);
    expect(pathwayBonusFor({ alreadyAwarded: false, passedCount: 0, totalLessons: 0 })).toBe(0);
  });
});

describe("gekoLineForScore", () => {
  it("has a distinct line for perfect, passed and failed attempts", () => {
    const perfect = gekoLineForScore(1);
    const passed = gekoLineForScore(0.7);
    const failed = gekoLineForScore(0.4);

    expect(new Set([perfect, passed, failed]).size).toBe(3);
    expect(passed).not.toContain("Not yet");
    expect(failed).toContain("Not yet");
  });
});
