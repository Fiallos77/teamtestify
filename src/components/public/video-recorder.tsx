"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

function pickMimeType() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported?.(type));
}

export function VideoRecorder({
  onRecorded,
  maxSeconds,
}: {
  onRecorded: (file: File) => void;
  // From entitlements (convex/entitlements.ts maxVideoSeconds) via
  // public.getSpaceBySlug — 120s free / 180s pro. No local fallback: the
  // caller must pass the real plan-derived value.
  maxSeconds: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [supported, setSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // Defaulting `supported` to true and correcting it here (rather than a
    // lazy useState initializer) is deliberate: this runs identically on
    // the server (window is undefined -> false) and the client's first
    // paint, so SSR and hydration render the same tree. A lazy initializer
    // would compute true on the client immediately, before hydration,
    // producing a real SSR/client mismatch for this conditional UI.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(
      typeof window !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== "undefined" &&
        !!pickMimeType()
    );
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!recording) return;
    if (seconds >= maxSeconds) {
      stopRecording();
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s + 1), 1000);
    return () => clearTimeout(t);
  }, [recording, seconds, maxSeconds]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      await videoRef.current.play();
    }

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType ?? "video/webm" });
      const file = new File([blob], `testimonial.${mimeType?.includes("mp4") ? "mp4" : "webm"}`, {
        type: mimeType ?? "video/webm",
      });
      setPreviewUrl(URL.createObjectURL(blob));
      onRecorded(file);
      stream.getTracks().forEach((t) => t.stop());
    };
    recorder.start();
    recorderRef.current = recorder;
    setSeconds(0);
    setRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">
        In-browser recording isn&apos;t supported in this browser. Please upload a
        video file instead.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {previewUrl ? (
        <video src={previewUrl} controls className="w-full rounded-2xl" />
      ) : (
        <video ref={videoRef} className="w-full rounded-2xl bg-foreground" />
      )}
      <div className="flex items-center gap-3">
        {!recording && !previewUrl && (
          <Button type="button" onClick={startRecording}>
            Start recording
          </Button>
        )}
        {recording && (
          <Button type="button" variant="destructive" onClick={stopRecording}>
            Stop ({maxSeconds - seconds}s left)
          </Button>
        )}
        {previewUrl && !recording && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setPreviewUrl(null);
              chunksRef.current = [];
            }}
          >
            Record again
          </Button>
        )}
      </div>
    </div>
  );
}
