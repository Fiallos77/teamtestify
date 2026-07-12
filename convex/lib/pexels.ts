// Contextual background photos via the Pexels API (env PEXELS_API_KEY). The AI
// gives a 1–2 word query from the testimonial topic; we fetch one landscape
// photo and return a URL for the render route to inline behind a readability
// scrim. Never on the critical path — any failure returns null and the layout
// falls back to a brand gradient. Runs in a "use node" Convex action.

export const PEXELS_ALLOWED_HOSTS = ["images.pexels.com", "www.pexels.com", "pexels.com"];

export async function searchPhoto(query: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  const q = query.trim();
  if (!apiKey || !q) return null;
  try {
    const url =
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}` +
      `&orientation=landscape&per_page=1&size=medium`;
    const res = await fetch(url, { headers: { Authorization: apiKey } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      photos?: { src?: { large2x?: string; large?: string; original?: string } }[];
    };
    const src = data.photos?.[0]?.src;
    return src?.large2x ?? src?.large ?? src?.original ?? null;
  } catch {
    return null;
  }
}

// SSRF guard for the render route: only inline photos from Pexels' image host.
export function isAllowedPhotoHost(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return PEXELS_ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
