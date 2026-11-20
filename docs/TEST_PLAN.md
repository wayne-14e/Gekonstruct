# M7 Tester Checklist

## Participants

Recruit 5 testers who have a grown public GitHub project. Each tester should connect their own
repository rather than using a demo repository.

## Success metrics

The M7 target mirrors the `BLUEPRINT.md` Module 3 hypothesis:

- 3 of 5 testers complete at least one pathway.
- 3 of 5 pass a quiz without re-reading.
- 2 of 5 return within 7 days and start a second pathway or a debug session.

## Event checklist

Record the following from Firestore `projects/{projectId}/events`:

| Tester action | Required event |
|---|---|
| Connect a project | `project_created` |
| Analysis finishes | `analysis_ready` |
| Open and view an Architecture overview section | `overview_section_viewed` |
| Open a Foundations lesson | `lesson_viewed` |
| Pass a Foundations lesson quiz | `quiz_passed` |
| Complete a Foundations pathway | `pathway_completed` |
| Start a Debug & Learn session | `debug_created` |
| Complete a Debug & Learn quiz | `debug_completed` |
| Return to a project hub 24+ hours later | `return_visit` |

Use `meta` to disambiguate the result:

- `analysis_ready`: `at` is the analysis completion time.
- `quiz_passed`: confirm `meta.passed` is not used; pass state is represented by the event
  type. `meta.score >= 0.70` is the passing threshold.
- `pathway_completed`: `meta.pathway` is `architecture`, `foundations`, or `debug`.
- `overview_section_viewed`: `meta.section` identifies each of `summary`, `skillmap`, `flow`,
  and `concepts`.
- `lesson_viewed`: `meta.lessonId` identifies the lesson.
- `debug_created`: `meta.sessionId`, `meta.symptom`, and matched-file counts identify the
  live session.
- `debug_completed`: `meta.passed === true` records a completed debug quiz.
- `return_visit`: `meta.analysisReadyAt` and `meta.hoursAfterAnalysis` confirm the 24-hour
  threshold; the event ID is deterministic and must occur at most once per project.

## Metrics worksheet

For each of the five testers, record one row with:

| Field | Record |
|---|---|
| Tester | Anonymous label `T1` through `T5` |
| Public repo and project ID | Verified public repository URL and Firestore project ID |
| First pathway | Architecture, Foundations, or Debug |
| Completed at least one pathway | `Yes/No` |
| Passed a quiz without re-reading | `Yes/No` |
| Explained a key implementation detail | `Yes/No`, plus a short quoted summary |
| Returned within 7 days and started a second pathway/session | `Yes/No` |
| Issues | Runtime, console, quota, or evidence-path failures |

Calculate the targets from the recorded rows:

- **One-pathway threshold:** count testers with an Architecture, Foundations, or Debug
  completion event. Target: at least 3 of 5.
- **No-re-reading quiz threshold:** count `Yes` in the worksheet's quiz field. Target:
  at least 3 of 5.
- **Second-activity threshold:** count testers whose project has `return_visit` at 24+ hours
  and who subsequently started a second pathway or debug session within 7 days. Target:
  at least 2 of 5.

Do not infer a pathway completion from an `analysis_ready` event alone. Live tester evidence,
Firestore events and the worksheet must agree.

## 5-tester procedure

For each tester, record:

1. Public repository URL and project ID.
2. Sign-in success and `/dashboard` redirect.
3. Ingestion completion and absence of secrets/build output in the stored snapshot.
4. Architecture, Foundations, or Debug pathway selected first.
5. Whether the tester completed at least one quiz with no re-reading.
6. Whether the tester could explain a key implementation detail in their own words.
7. Whether they returned within 7 days and started a second pathway or debug session.
8. Any runtime, console, quota, or evidence-path issues.

Map each result to the success metrics above. Do not replace missing live results with mock or
synthetic completion data.
