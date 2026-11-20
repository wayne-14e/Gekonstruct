import { z } from "zod";

export const REPO_ROAST_RESERVATION_LEASE_MS = 120_000;

export const RepoRoastSchema = z.object({
  quote: z.string().trim().min(8).max(220),
  file: z.string().trim().min(1).max(500),
});

export type RepoRoast = z.infer<typeof RepoRoastSchema>;

const PendingRepoRoastSchema = z.object({
  status: z.literal("pending"),
  reservationToken: z.string().min(1),
  reservedAt: z.number().int().nonnegative(),
});

export const CompletedRepoRoastSchema = RepoRoastSchema.extend({
  status: z.literal("complete"),
  generatedAt: z.number().int().nonnegative(),
  model: z.string().min(1),
  promptVersion: z.string().min(1),
});

export const RepoRoastRecordSchema = z.discriminatedUnion("status", [
  PendingRepoRoastSchema,
  CompletedRepoRoastSchema,
]);

export type CompletedRepoRoast = z.infer<typeof CompletedRepoRoastSchema>;

export type RepoRoastReservationDecision =
  | { kind: "claim" }
  | { kind: "busy" }
  | { kind: "complete"; roast: CompletedRepoRoast }
  | { kind: "invalid" };

export function decideRepoRoastReservation(
  raw: unknown,
  now: number,
): RepoRoastReservationDecision {
  if (raw === undefined) return { kind: "claim" };

  const parsed = RepoRoastRecordSchema.safeParse(raw);
  if (!parsed.success) return { kind: "invalid" };
  if (parsed.data.status === "complete") return { kind: "complete", roast: parsed.data };
  if (now - parsed.data.reservedAt < REPO_ROAST_RESERVATION_LEASE_MS) {
    return { kind: "busy" };
  }
  return { kind: "claim" };
}
