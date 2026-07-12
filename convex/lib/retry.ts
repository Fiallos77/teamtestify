// Small retry wrapper for flaky external calls (the AI provider, image
// rendering). Defaults to 1 retry with exponential backoff — enough to absorb
// the transient "first attempt errors, second works" failures seen with the
// provider / Cloudflare-fronted fetches without turning a hard failure into a
// long hang.
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseMs?: number } = {}
): Promise<T> {
  const retries = opts.retries ?? 1;
  const baseMs = opts.baseMs ?? 400;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, baseMs * 2 ** attempt));
      }
    }
  }
  throw lastErr;
}
