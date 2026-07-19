import { describe, expect, test } from "vitest";
import {
  SPACE_EDITOR_ERRORS,
  hasErrors,
  validateSpaceEditor,
} from "./space-editor-validation";

describe("validateSpaceEditor", () => {
  test("create mode requires name, description, and slug", () => {
    const errors = validateSpaceEditor({ name: "", description: "", publicSlug: "" }, "create");
    expect(errors).toEqual({
      name: SPACE_EDITOR_ERRORS.name,
      description: SPACE_EDITOR_ERRORS.description,
      publicSlug: SPACE_EDITOR_ERRORS.publicSlug,
    });
    expect(hasErrors(errors)).toBe(true);
  });

  test("create mode passes when all three are present", () => {
    const errors = validateSpaceEditor(
      { name: "Beta", description: "Feedback", publicSlug: "beta" },
      "create"
    );
    expect(errors).toEqual({});
    expect(hasErrors(errors)).toBe(false);
  });

  test("whitespace-only values count as missing", () => {
    const errors = validateSpaceEditor(
      { name: "   ", description: "   ", publicSlug: "   " },
      "create"
    );
    expect(errors).toEqual({
      name: SPACE_EDITOR_ERRORS.name,
      description: SPACE_EDITOR_ERRORS.description,
      publicSlug: SPACE_EDITOR_ERRORS.publicSlug,
    });
  });

  test("edit mode does not require a description", () => {
    const errors = validateSpaceEditor(
      { name: "Beta", description: "", publicSlug: "beta" },
      "edit"
    );
    expect(errors).toEqual({});
  });

  test("edit mode still requires name and slug", () => {
    const errors = validateSpaceEditor({ name: "", description: "x", publicSlug: "" }, "edit");
    expect(errors).toEqual({
      name: SPACE_EDITOR_ERRORS.name,
      publicSlug: SPACE_EDITOR_ERRORS.publicSlug,
    });
  });
});
