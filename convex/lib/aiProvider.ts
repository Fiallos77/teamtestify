// Single seam between the app and whatever LLM provider we use. Everything
// that needs generated text goes through generateText() so swapping providers
// (or models) later touches only this file. Currently Google Gemini
// (gemini-2.5-flash) over the REST API; the API key comes from the
// GEMINI_API_KEY Convex env var and is never hardcoded.

const GEMINI_MODEL = "gemini-2.5-flash";
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
