// Single seam between the app and whatever LLM provider we use. Everything
// that needs generated text goes through generateText() so swapping providers
// (or models) later touches only this file. Currently Google Gemini
// (gemini-3.5-flash) over the REST API; the API key comes from the
// GEMINI_API_KEY Convex env var and is never hardcoded.
//
// NOTE: Google discontinued gemini-2.5-flash on the Generative Language API in
// July 2026 (404 "no longer available to new users") ahead of its published
// shutdown date. gemini-3.5-flash is the current versioned GA flash model —
// verified callable by our key via ListModels + a live generateContent probe.
// Prefer a versioned id over the gemini-flash-latest alias, which has 404'd
// unexpectedly. If Google churns this again, this const is the only change.
const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GenerateTextOptions {
  prompt: string;
  /** Optional system instruction steering tone/format/language. */
  system?: string;
  /** e.g. "application/json" to ask the model for parseable JSON. */
  responseMimeType?: string;
  /** Provider-native response schema (Gemini generationConfig.responseSchema). */
  responseSchema?: unknown;
}

export async function generateText(options: GenerateTextOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const generationConfig: Record<string, unknown> = {};
  if (options.responseMimeType) generationConfig.responseMimeType = options.responseMimeType;
  if (options.responseSchema) generationConfig.responseSchema = options.responseSchema;

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: options.prompt }] }],
  };
  if (options.system) body.systemInstruction = { parts: [{ text: options.system }] };
  if (Object.keys(generationConfig).length > 0) body.generationConfig = generationConfig;

  const res = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini request failed (${res.status}): ${detail.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || text.length === 0) {
    throw new Error("Gemini returned no text");
  }
  return text;
}
