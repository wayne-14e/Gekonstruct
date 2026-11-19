/**
 * Deterministic half of the Foundations stages (BLUEPRINT §6). The model writes prose; this
 * module proves that every file it points at exists in the stored snapshot and that the
 * lesson is actually teachable and assessable before anything reaches Firestore.
 *
 * Hard failures (invented files, missing real citations, bad quiz shape) go back to the
 * model for exactly one repair attempt. Excess lessons are trimmed instead of burning a
 * repair round-trip; the route records what was trimmed in the stage event.
 */
import {
  LESSON_LIMITS,
  LessonDocSchema,
  LessonsModelSchema,
  type LessonDoc,
  type LessonModel,
  type Part,
} from "@/lib/domain/lesson";
import {
  directoryIndex,
  inventedPathMentions,
  slugify,
  uniqueId,
} from "@/lib/pipeline/architecture";

export type LessonsNormalization =
  | {
      ok: true;
      value: LessonDoc[];
      droppedCodeRefs: string[];
      softWarnings: string[];
      trimmedCounts: string[];
    }
  | { ok: false; problems: string[]; droppedCodeRefs: string[] };

export type NormalizeLessonsOptions = {
  part: Part;
  /** Order of the first lesson in this part (1-based). */
  startOrder: number;
  /** Ids already stored under this project (part 1 ids when writing part 2). */
  existingIds: ReadonlySet<string>;
  /** How many lessons this part may add, including the total-pathway cap. */
  allowedCount: { min: number; max: number };
  /** Part 2 only: the finished pathway must reach the blueprint minimum. */
  requireTotalMin?: number;
};

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function distinctRealPaths(
  text: string,
  allowed: ReadonlySet<string>,
  max = 6,
): string[] {
  const found: string[] = [];
  for (const path of allowed) {
    if (text.includes(path)) {
      found.push(path);
      if (found.length >= max) break;
    }
  }
  return found;
}

function normalizePath(path: string): string {
  const trimmed = path.trim();
  return trimmed.startsWith("./") ? trimmed.slice(2) : trimmed;
}

function lessonProblems(
  lesson: LessonModel,
  index: number,
  allowed: ReadonlySet<string>,
  dirs: ReadonlySet<string>,
  dropped: Set<string>,
): string[] {
  const label = `lessons[${index}] "${lesson.title}"`;
  const problems: string[] = [];

  const prose = [lesson.explain, lesson.goal, lesson.gekoTip, ...lesson.codeRefs.map((ref) => ref.note)].join(
    "\n\n",
  );
  for (const path of inventedPathMentions(prose, allowed, dirs)) {
    problems.push(`${label}: "${path}" is not a file in this repository.`);
  }

  const cited = distinctRealPaths(lesson.explain, allowed);
  if (cited.length < 2) {
    problems.push(
      `${label}.explain: cite at least 2 distinct real file paths in backticks (found ${cited.length}).`,
    );
  }

  const words = wordCount(lesson.explain);
  if (words < LESSON_LIMITS.explainWords.min || words > LESSON_LIMITS.explainWords.max) {
    problems.push(
      `${label}.explain: ${words} words; keep it between ${LESSON_LIMITS.explainWords.min} and ${LESSON_LIMITS.explainWords.max}.`,
    );
  }

  const keptRefs: string[] = [];
  for (const ref of lesson.codeRefs) {
    const path = normalizePath(ref.file);
    if (!allowed.has(path)) {
      dropped.add(path);
      continue;
    }
    if (!keptRefs.includes(path)) keptRefs.push(path);
  }
  if (keptRefs.length === 0) {
    problems.push(`${label}.codeRefs: none of the listed paths exist in this repository.`);
  }

  if (lesson.quiz.length < LESSON_LIMITS.quiz.min) {
    problems.push(`${label}.quiz: at least ${LESSON_LIMITS.quiz.min} questions are required.`);
  }

  lesson.quiz.forEach((question, questionIndex) => {
    if (new Set(question.options).size !== question.options.length) {
      problems.push(`${label}.quiz[${questionIndex}]: options must be distinct.`);
    }
    if (!question.why.trim()) {
      problems.push(`${label}.quiz[${questionIndex}]: a "why" explanation is required.`);
    }
  });

  for (const path of inventedPathMentions(
    lesson.quiz
      .map((question) => [question.question, ...question.options, question.why].join("\n"))
      .join("\n"),
    allowed,
    dirs,
  )) {
    problems.push(`${label}.quiz: "${path}" is not a file in this repository.`);
  }

  return problems;
}

/**
 * Validate + normalise one part. Orders continue from `startOrder`, ids are slugged and
 * de-duplicated against earlier parts, and XP is always the blueprint value.
 */
export function normalizeLessons(
  raw: unknown,
  allowedPaths: string[],
  options: NormalizeLessonsOptions,
): LessonsNormalization {
  const parsed = LessonsModelSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      problems: parsed.error.issues.slice(0, 10).map((issue) => {
        const where = issue.path.length > 0 ? issue.path.join(".") : "root";
        return `${where}: ${issue.message}`;
      }),
      droppedCodeRefs: [],
    };
  }

  const allowed = new Set(allowedPaths.map(normalizePath));
  const dirs = directoryIndex(allowed);
  const dropped = new Set<string>();
  const problems: string[] = [];
  const softWarnings: string[] = [];
  const trimmedCounts: string[] = [];

  const modelLessons = parsed.data.lessons;
  const kept = modelLessons.slice(0, options.allowedCount.max);

  if (modelLessons.length > options.allowedCount.max) {
    trimmedCounts.push(
      `lessons ${modelLessons.length} → ${options.allowedCount.max} for part ${options.part}`,
    );
  }
  if (kept.length < options.allowedCount.min) {
    problems.push(
      `lessons: ${kept.length} item(s); part ${options.part} needs at least ${options.allowedCount.min}.`,
    );
  }
  if (
    options.requireTotalMin !== undefined &&
    options.existingIds.size + kept.length < options.requireTotalMin
  ) {
    problems.push(
      `lessons: ${options.existingIds.size + kept.length} total; the pathway needs at least ${options.requireTotalMin}.`,
    );
  }

  const usedIds = new Set(options.existingIds);
  const value: LessonDoc[] = [];

  kept.forEach((lesson, index) => {
    problems.push(...lessonProblems(lesson, index, allowed, dirs, dropped));

    const refs: string[] = [];
    for (const ref of lesson.codeRefs) {
      const path = normalizePath(ref.file);
      if (!allowed.has(path) || refs.includes(path)) continue;
      refs.push(path);
      if (refs.length >= LESSON_LIMITS.codeRefs.max) break;
    }

    if (refs.length === 0) return;

    if (!distinctRealPaths(lesson.gekoTip, allowed, 1).length) {
      softWarnings.push(`lessons[${index}] "${lesson.title}": Geko tip cites no real path.`);
    }

    const id = uniqueId(slugify(lesson.id || lesson.title), usedIds);
    const normalised: LessonDoc = {
      id,
      order: options.startOrder + index,
      part: options.part,
      title: lesson.title,
      goal: lesson.goal,
      explain: lesson.explain,
      codeRefs: lesson.codeRefs
        .filter((ref) => refs.includes(normalizePath(ref.file)))
        .slice(0, LESSON_LIMITS.codeRefs.max)
        .map((ref) => ({ ...ref, file: normalizePath(ref.file) })),
      gekoTip: lesson.gekoTip,
      xp: LESSON_LIMITS.xp,
      quiz: lesson.quiz.slice(0, LESSON_LIMITS.quiz.max),
    };

    const finalCheck = LessonDocSchema.safeParse(normalised);
    if (!finalCheck.success) {
      for (const issue of finalCheck.error.issues.slice(0, 5)) {
        problems.push(
          `lessons[${index}] "${lesson.title}.${issue.path.join(".") || "root"}": ${issue.message}`,
        );
      }
      return;
    }

    value.push(finalCheck.data);
  });

  if (problems.length > 0) {
    return { ok: false, problems, droppedCodeRefs: [...dropped] };
  }

  return {
    ok: true,
    value,
    droppedCodeRefs: [...dropped],
    softWarnings,
    trimmedCounts,
  };
}
