import { describe, expect, it } from "vitest";
import {
  decideRepoRoastReservation,
  REPO_ROAST_RESERVATION_LEASE_MS,
} from "@/lib/domain/repo-roast";

describe("decideRepoRoastReservation", () => {
  it("allows the first roast to reserve the project", () => {
    expect(decideRepoRoastReservation(undefined, 1_000)).toEqual({ kind: "claim" });
  });

  it("returns an existing completed roast instead of generating another", () => {
    const roast = {
      status: "complete",
      quote: "Your package file is carrying a few passengers it never asked for.",
      file: "package.json",
      generatedAt: 1_000,
      model: "deepseek-flash",
      promptVersion: "roast-v1",
    };

    expect(decideRepoRoastReservation(roast, 2_000)).toEqual({ kind: "complete", roast });
  });

  it("blocks concurrent calls while the generation lease is active", () => {
    expect(
      decideRepoRoastReservation(
        { status: "pending", reservationToken: "token", reservedAt: 1_000 },
        1_001,
      ),
    ).toEqual({ kind: "busy" });
  });

  it("reclaims an abandoned reservation after its lease expires", () => {
    expect(
      decideRepoRoastReservation(
        { status: "pending", reservationToken: "token", reservedAt: 1_000 },
        1_000 + REPO_ROAST_RESERVATION_LEASE_MS,
      ),
    ).toEqual({ kind: "claim" });
  });
});
