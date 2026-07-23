"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { initialResetPasswordStep, passwordsMismatch, type ResetPasswordStep } from "./validation";

function RequestStep({ onSent }: { onSent: () => void }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: requestError } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (requestError) {
      setError(requestError.message ?? "Could not send the reset link");
      return;
    }
    onSent();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/sign-in" className="underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

function SentStep() {
  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">
        If an account exists for that email, check your inbox for a reset link.
      </p>
      <p className="text-sm">
        <Link href="/sign-in" className="underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

function ResetStep({ token }: { token: string }) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (passwordsMismatch(newPassword, confirmPassword)) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    const { error: resetError } = await authClient.resetPassword({ newPassword, token });
    setSubmitting(false);

    if (resetError) {
      setError(resetError.message ?? "This reset link is invalid or has expired.");
      return;
    }

    router.push("/sign-in?reset=success");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}

function ResetPasswordFlow() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [step, setStep] = useState<ResetPasswordStep>(() => initialResetPasswordStep(token));

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
        </CardHeader>
        <CardContent>
          {step === "reset" && token ? (
            <ResetStep token={token} />
          ) : step === "sent" ? (
            <SentStep />
          ) : (
            <RequestStep onSent={() => setStep("sent")} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  // useSearchParams needs a Suspense boundary under the App Router.
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <ResetPasswordFlow />
    </Suspense>
  );
}
