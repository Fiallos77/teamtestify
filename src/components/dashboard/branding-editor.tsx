"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SpaceBranding = {
  primaryColor?: string;
  logoStorageId?: Id<"_storage">;
  backgroundStyle?: string;
};

const BACKGROUND_PRESETS = [
  { value: "none", label: "None" },
  { value: "solid", label: "Solid tint" },
  { value: "gradient", label: "Soft gradient" },
];

export function BrandingEditor({
  branding,
  onChange,
}: {
  branding: SpaceBranding;
  onChange: (branding: SpaceBranding) => void;
}) {
  const generateLogoUploadUrl = useMutation(api.spaces.generateLogoUploadUrl);
  const logoUrl = useQuery(
    api.spaces.getLogoUrl,
    branding.logoStorageId ? { logoStorageId: branding.logoStorageId } : "skip"
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploadUrl = await generateLogoUploadUrl({});
      const res = await fetch(uploadUrl, { method: "POST", body: file });
      const { storageId } = await res.json();
      onChange({ ...branding, logoStorageId: storageId });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="flex flex-col items-center gap-3">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Logo preview"
              className="size-16 rounded-md border object-contain p-1"
            />
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
            </Button>
            {branding.logoStorageId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange({ ...branding, logoStorageId: undefined })}
              >
                Remove
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoChange}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="primary-color">Primary color</Label>
        <div className="flex items-center gap-2">
          <input
            id="primary-color"
            type="color"
            value={branding.primaryColor ?? "#6366f1"}
            onChange={(e) => onChange({ ...branding, primaryColor: e.target.value })}
            className="h-8 w-10 cursor-pointer rounded border"
          />
          <Input
            value={branding.primaryColor ?? ""}
            onChange={(e) => onChange({ ...branding, primaryColor: e.target.value })}
            placeholder="#6366f1"
            className="max-w-40"
          />
          {branding.primaryColor && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange({ ...branding, primaryColor: undefined })}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Background style</Label>
        <Select
          value={branding.backgroundStyle ?? "none"}
          onValueChange={(v) => onChange({ ...branding, backgroundStyle: v ?? "none" })}
        >
          <SelectTrigger>
            <SelectValue>
              {(value: string) =>
                BACKGROUND_PRESETS.find((p) => p.value === value)?.label ?? value
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {BACKGROUND_PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
