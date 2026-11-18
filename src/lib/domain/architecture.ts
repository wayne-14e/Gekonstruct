import { z } from "zod";

/**
 * The architecture guidebook (BLUEPRINT §6, stage `architecture`). Model output is parsed
 * with `ArchitectureModelSchema` first, then normalised against the real snapshot paths
 * by `src/lib/pipeline/architecture.ts` before it is stored as `GuidebookDocSchema`.
 *
 * Counts are enforced in the normaliser rather than in zod: a model that returns eight
 * layers should get its extra layer trimmed, not burn a repair round-trip.
 */
export const ARCHITECTURE_LIMITS = {
  layers: { min: 3, max: 7 },
  dataFlow: { min: 4, max: 8 },
  concepts: { min: 5, max: 12 },
  filesPerItem: { min: 1, max: 12 },
  plainSummaryWords: 120,
  mermaidChars: 4_000,
} as const;

const TextSchema = (max: number) => z.string().trim().min(1).max(max);
const FilePathSchema = z.string().trim().min(1).max(300);

export const SummarySchema = z.object({
  whatItDoes: TextSchema(800),
  plainSummary: TextSchema(2_000),
  gekoIntro: TextSchema(600),
});

export const LayerSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: TextSchema(120),
  purpose: TextSchema(600),
  files: z.array(FilePathSchema).min(1).max(40),
  plainExplanation: TextSchema(2_500),
});

export const DataFlowStepSchema = z.object({
  from: TextSchema(160),
  to: TextSchema(160),
  whatHappens: TextSchema(1_200),
});

export const ConceptSchema = z.object({
  id: z.string().trim().min(1).max(80),
  term: TextSchema(120),
  plainDefinition: TextSchema(1_200),
  files: z.array(FilePathSchema).min(1).max(40),
  whyItMatters: TextSchema(1_200),
});

/** Raw shape the model must return. Deliberately loose on counts and ids. */
export const ArchitectureModelSchema = z.object({
  summary: SummarySchema,
  architecture: z.object({
    layers: z.array(LayerSchema).min(1).max(20),
    dataFlow: z.array(DataFlowStepSchema).min(1).max(20),
    mermaid: z.string().max(8_000).nullable().optional(),
  }),
  concepts: z.array(ConceptSchema).min(1).max(40),
});

export type ArchitectureModel = z.infer<typeof ArchitectureModelSchema>;

/** What the overview page reads: the validated model plus provenance. */
export const ArchitectureSchema = z.object({
  summary: SummarySchema,
  architecture: z.object({
    layers: z.array(LayerSchema).min(ARCHITECTURE_LIMITS.layers.min).max(ARCHITECTURE_LIMITS.layers.max),
    dataFlow: z
      .array(DataFlowStepSchema)
      .min(ARCHITECTURE_LIMITS.dataFlow.min)
      .max(ARCHITECTURE_LIMITS.dataFlow.max),
    mermaid: z.string().max(ARCHITECTURE_LIMITS.mermaidChars).nullable(),
  }),
  concepts: z
    .array(ConceptSchema)
    .min(ARCHITECTURE_LIMITS.concepts.min)
    .max(ARCHITECTURE_LIMITS.concepts.max),
});

export type Architecture = z.infer<typeof ArchitectureSchema>;

export const GuidebookDocSchema = ArchitectureSchema.extend({
  analyzedAt: z.number().int().nonnegative(),
  model: z.string().min(1),
  promptVersion: z.string().min(1),
});

export type GuidebookDoc = z.infer<typeof GuidebookDocSchema>;
