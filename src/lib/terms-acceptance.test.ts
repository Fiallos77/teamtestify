// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import { acceptTerms, hasAcceptedTerms } from "./terms-acceptance";

afterEach(() => {
  window.localStorage.clear();
});

describe("hasAcceptedTerms", () => {
  test("false before the visitor has ever accepted", () => {
    expect(hasAcceptedTerms()).toBe(false);
  });

  test("true once acceptTerms() has been called", () => {
    acceptTerms();
    expect(hasAcceptedTerms()).toBe(true);
  });

  test("persists under the v1 key so a future breaking change can force re-acceptance", () => {
    acceptTerms();
    expect(window.localStorage.getItem("accepted_terms_v1")).toBe("true");
  });
});
