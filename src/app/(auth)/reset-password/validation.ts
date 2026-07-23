export type ResetPasswordStep = "request" | "sent" | "reset";

// A URL with `?token=` (empty string) must NOT land on the reset step — that
// would submit an empty token to the server and fail with a confusing
// "invalid token" error instead of just asking for the email again.
export function initialResetPasswordStep(token: string | null): "request" | "reset" {
  return token ? "reset" : "request";
}

export function passwordsMismatch(newPassword: string, confirmPassword: string): boolean {
  return newPassword !== confirmPassword;
}
