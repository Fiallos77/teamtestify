"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";

export function TermsAcceptanceRequired() {
  const acceptTerms = useMutation(api.userSettings.acceptTerms);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setSubmitting(true);
    setError(null);
    try {
      await acceptTerms({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your acceptance");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 pt-12 text-center">
      <div>
        <h1 className="text-xl font-semibold">Accept our Privacy Policy and Terms of Service</h1>
        <p className="mx-auto max-w-sm text-muted-foreground">
          By creating an account, you agree to our{" "}
          <Link
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link
            href="/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Terms of Service
          </Link>
          .
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-3 text-left">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          I accept Privacy Policy and Terms of Service
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={handleAccept} disabled={!checked || submitting} className="w-full">
          {submitting ? "Saving…" : "Accept"}
        </Button>
      </div>
    </div>
  );
}
