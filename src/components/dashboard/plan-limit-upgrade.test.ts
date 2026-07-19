import { describe, expect, test } from "vitest";
import { PLAN_UPGRADE_HREF } from "./plan-limit-upgrade";

describe("plan limit upgrade prompt", () => {
  test("upgrade link points at the account Plan tab", () => {
    expect(PLAN_UPGRADE_HREF).toBe("/dashboard/settings?tab=plan");
  });
});
