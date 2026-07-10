import { describe, expect, test } from "vitest";
import { PLAN_MATRIX } from "./plan-matrix";
import {
  FREE_MAX_SPACES,
  PRO_MAX_SPACES,
  FREE_MAX_PUBLISHED_TESTIMONIALS,
  FREE_MAX_PUBLISHED_VIDEO_TESTIMONIALS,
  FREE_MAX_VIDEO_SECONDS,
  PRO_MAX_VIDEO_SECONDS,
  FREE_MAX_TEAM_MEMBERS,
  PRO_MAX_TEAM_MEMBERS,
} from "../../../convex/entitlements";

// The marketing site's pricing table is hand-written copy, disconnected
// from convex/entitlements.ts (the actual enforcement). Nothing else would
// catch it if the two drifted — e.g. someone bumps a limit in entitlements
// and forgets the landing page still advertises the old number.
function row(label: string) {
  const found = PLAN_MATRIX.find((r) => r.label === label);
  if (!found) throw new Error(`Missing plan matrix row: "${label}"`);
  return found;
}

describe("marketing plan matrix stays in sync with convex/entitlements.ts", () => {
  test("spaces", () => {
    expect(row("Spaces")).toEqual({
      label: "Spaces",
      free: String(FREE_MAX_SPACES),
      pro: String(PRO_MAX_SPACES),
    });
  });

  test("published testimonials", () => {
    expect(row("Testimonials published").free).toBe(`${FREE_MAX_PUBLISHED_TESTIMONIALS} total`);
  });

  test("published video testimonials", () => {
    expect(row("Video testimonials published").free).toBe(
      String(FREE_MAX_PUBLISHED_VIDEO_TESTIMONIALS)
    );
  });

  test("max video length, converted from seconds to minutes", () => {
    expect(row("Max video length")).toEqual({
      label: "Max video length",
      free: `${FREE_MAX_VIDEO_SECONDS / 60} min`,
      pro: `${PRO_MAX_VIDEO_SECONDS / 60} min`,
    });
  });

  test("team members", () => {
    expect(row("Team members")).toEqual({
      label: "Team members",
      free: String(FREE_MAX_TEAM_MEMBERS),
      pro: String(PRO_MAX_TEAM_MEMBERS),
    });
  });
});
