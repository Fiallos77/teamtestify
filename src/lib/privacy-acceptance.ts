const STORAGE_KEY = "accepted_privacy_v1";

// Gates the public collection page's Privacy Policy modal. Not a security
// control — just a per-browser "don't nag again" flag, so failures (SSR,
// private browsing) fail open rather than blocking a visitor's submission.
export function hasAcceptedPrivacy(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return true;
  }
}

export function acceptPrivacy(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // Storage disabled — the modal will just reappear next visit.
  }
}
