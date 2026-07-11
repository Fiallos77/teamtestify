// The social-image render route (a Next.js Node handler) must trust the
// watermark flag and testimonial content WITHOUT re-authenticating: a Free user
// must not be able to strip the watermark by editing the request. So the Convex
// generateImageProposal action — which already authenticated the user and knows
// their plan — signs the authoritative render context with an HMAC, and the
// route only renders what verifies.
//
// Uses Web Crypto (globalThis.crypto.subtle) rather than node:crypto so this
// file bundles cleanly in every runtime Convex might place it in — the default
// V8 runtime, the "use node" action, the Next route handler, and vitest.

// The quote/headline is NOT signed — it's the user's chosen proposal text,
// passed in the render request and safe to be client-controlled. Only the
// tamper-sensitive bits (watermark, brand color, whose testimonial) are signed.
export interface RenderContent {
  authorName: string;
  authorTitle?: string;
  authorCompany?: string;
  authorHandle?: string;
  rating?: number;
  photoUrl?: string; // Convex serving URL; the route fetches + inlines it
}

export interface RenderContext {
  testimonialId: string;
  watermark: boolean;
  primaryColor: string;
  content: RenderContent;
}

const enc = new TextEncoder();

function toB64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.IMAGE_RENDER_SECRET;
  if (!secret) throw new Error("IMAGE_RENDER_SECRET is not configured");
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signRenderContext(ctx: RenderContext): Promise<string> {
  const payload = toB64Url(enc.encode(JSON.stringify(ctx)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(payload));
  return `${payload}.${toB64Url(new Uint8Array(sig))}`;
}

export async function verifyRenderToken(token: string): Promise<RenderContext | null> {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  let ok: boolean;
  try {
    ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      fromB64Url(token.slice(dot + 1)),
      enc.encode(payload)
    );
  } catch {
    return null;
  }
  if (!ok) return null;
  try {
    return JSON.parse(new TextDecoder().decode(fromB64Url(payload))) as RenderContext;
  } catch {
    return null;
  }
}
