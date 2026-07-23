const STORAGE_KEY = "accepted_terms_v1";

// Gates the sign-in page's Privacy Policy / Terms of Service modal. Not a
// security control — just a per-browser "don't nag again" flag, so failures
// (SSR, private browsing) fail open rather than blocking sign-in.
export function hasAcceptedTerms(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return true;
  }
}

export function acceptTerms(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // Storage disabled — the modal will just reappear next visit.
  }
}
