import { describe, expect, test } from "vitest";
import { AI_QUOTA_LIMIT_MESSAGE, AI_UPGRADE_HREF } from "./ai-quota-upgrade";

// Guards the exact upgrade-prompt copy the product asked for and the route it
// sends Free users to. Both the request assistant and the image generator
// render AiQuotaUpgradeAlert, which is built from these two constants, so this
// covers the prompt shown in both places.
describe("AI quota upgrade prompt", () => {
  test("message names the monthly AI limit and the Pro upgrade path", () => {
    expect(AI_QUOTA_LIMIT_MESSAGE).toBe(
      "You've reached your AI limit for this month. Upgrade to Pro to keep using the AI Assistant and generate unlimited images."
    );
  });

  test("upgrade link points at the account Plan tab", () => {
    expect(AI_UPGRADE_HREF).toBe("/dashboard/settings?tab=plan");
  });
});
