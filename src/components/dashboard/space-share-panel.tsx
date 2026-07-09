"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type CollectionMode = "text" | "video" | "both";

function actionPhrase(mode: CollectionMode) {
  switch (mode) {
    case "video":
      return "record a quick video testimonial";
    case "text":
      return "write a quick testimonial";
    case "both":
      return "share a quick testimonial (write or record a video, whichever's easier)";
  }
}

function template(
  kind: "email" | "twitter" | "linkedin",
  spaceName: string,
  publicUrl: string,
  mode: CollectionMode
) {
  const action = actionPhrase(mode);
  switch (kind) {
    case "email":
      return `Hi! We'd love it if you could ${action} about your experience with ${spaceName}. It only takes a minute: ${publicUrl}`;
    case "twitter":
      return `We're collecting customer stories for ${spaceName} — ${action} in under 2 minutes: ${publicUrl}`;
    case "linkedin":
      return `We're gathering feedback from customers like you about ${spaceName}. If you have a minute, we'd really appreciate it if you could ${action}: ${publicUrl}`;
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function SpaceSharePanel({
  spaceName,
  publicUrl,
  allowText,
  allowVideo,
}: {
  spaceName: string;
  publicUrl: string;
  allowText: boolean;
  allowVideo: boolean;
}) {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const mode: CollectionMode = allowText && allowVideo ? "both" : allowVideo ? "video" : "text";

  function handleDownload() {
    const canvas = canvasWrapperRef.current?.querySelector("canvas");
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "testimonial-qr.png";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <div ref={canvasWrapperRef} className="rounded-lg border bg-white p-3">
            <QRCodeCanvas value={publicUrl} size={140} />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Scan to open the collection page, or download to print or share.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
              Download PNG
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Ask a customer directly</p>
            <p className="text-sm text-muted-foreground">
              Copy one of these ready-made messages and send it yourself — by email, DM, or
              wherever you&apos;d reach that customer. The link is already inside the text, and
              the wording already matches what this space collects.
            </p>
          </div>
          <Tabs defaultValue="email">
            <TabsList>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="twitter">X / Twitter</TabsTrigger>
              <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
            </TabsList>
            {(["email", "twitter", "linkedin"] as const).map((kind) => {
              const text = template(kind, spaceName, publicUrl, mode);
              return (
                <TabsContent key={kind} value={kind} className="space-y-2">
                  <p className="rounded-md bg-muted p-3 text-sm">{text}</p>
                  <CopyButton text={text} />
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
