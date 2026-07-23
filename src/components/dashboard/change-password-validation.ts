export const CHANGE_PASSWORD_ERRORS = {
  mismatch: "New passwords don't match.",
  sameAsCurrent: "New password must be different from your current password.",
} as const;

export type ChangePasswordError = (typeof CHANGE_PASSWORD_ERRORS)[keyof typeof CHANGE_PASSWORD_ERRORS];

export function validateChangePassword({
  currentPassword,
  newPassword,
  confirmPassword,
}: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): ChangePasswordError | null {
  if (newPassword !== confirmPassword) return CHANGE_PASSWORD_ERRORS.mismatch;
  if (newPassword === currentPassword) return CHANGE_PASSWORD_ERRORS.sameAsCurrent;
  return null;
}
