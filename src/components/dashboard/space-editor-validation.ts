// Required-field validation for the space editor, kept free of React/JSX so it
// can be unit-tested in the node environment and shared by the editor. Space
// name and public URL slug are always required; a description is additionally
// required when creating a space (in edit mode it stays optional). Everything
// else has a sensible default and is optional. All three required fields live
// in the Identity tab, so the editor can switch there on a failed submit.

export const SPACE_EDITOR_ERRORS = {
  name: "Space name is required.",
  description: "A description is required.",
  publicSlug: "A public URL slug is required.",
} as const;

export interface SpaceEditorRequiredFields {
  name: string;
  description: string;
  publicSlug: string;
}

export interface SpaceEditorFieldErrors {
  name?: string;
  description?: string;
  publicSlug?: string;
}

export function validateSpaceEditor(
  fields: SpaceEditorRequiredFields,
  mode: "edit" | "create"
): SpaceEditorFieldErrors {
  const errors: SpaceEditorFieldErrors = {};
  if (!fields.name.trim()) errors.name = SPACE_EDITOR_ERRORS.name;
  if (mode === "create" && !fields.description.trim()) {
    errors.description = SPACE_EDITOR_ERRORS.description;
  }
  if (!fields.publicSlug.trim()) errors.publicSlug = SPACE_EDITOR_ERRORS.publicSlug;
  return errors;
}

export function hasErrors(errors: SpaceEditorFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}
