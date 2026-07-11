// Video transcription via Groq's hosted Whisper. Used only to give the AI text
// to work with when a testimonial is a video (no textContent) — never on the
// critical path, so every failure degrades to "" rather than throwing. The
// Groq endpoint accepts common audio/video containers (incl. webm/mp4) and
// extracts the audio itself, so no ffmpeg is needed. Runs in a "use node"
// Convex action.

// The task specified "whisper-large"; Groq's actual model id is
// whisper-large-v3. Kept as one const so a future id change is one line.
const GROQ_WHISPER_MODEL = "whisper-large-v3";
const GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export async function transcribeAudio(audio: Blob, filename: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return "";
  try {
    const form = new FormData();
    form.append("file", audio, filename);
    form.append("model", GROQ_WHISPER_MODEL);
    form.append("response_format", "json");

    const res = await fetch(GROQ_TRANSCRIBE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) return "";
    const data = (await res.json()) as { text?: unknown };
    return typeof data.text === "string" ? data.text.trim() : "";
  } catch {
    return "";
  }
}
