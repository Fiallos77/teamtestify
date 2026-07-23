// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import { acceptPrivacy, hasAcceptedPrivacy } from "./privacy-acceptance";

afterEach(() => {
  window.localStorage.clear();
});

describe("hasAcceptedPrivacy", () => {
  test("false before the visitor has ever accepted", () => {
    expect(hasAcceptedPrivacy()).toBe(false);
  });

  test("true once acceptPrivacy() has been called", () => {
    acceptPrivacy();
    expect(hasAcceptedPrivacy()).toBe(true);
  });

  test("persists under the v1 key so a future breaking change can force re-acceptance", () => {
    acceptPrivacy();
    expect(window.localStorage.getItem("accepted_privacy_v1")).toBe("true");
  });
});
