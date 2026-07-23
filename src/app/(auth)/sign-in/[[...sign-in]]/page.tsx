"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { acceptTerms, hasAcceptedTerms } from "@/lib/terms-acceptance";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justReset = searchParams.get("reset") === "success";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [termsChecked, setTermsChecked] = useState(false);

  useEffect(() => {
    setTermsAccepted(hasAcceptedTerms());
  }, []);

  function handleAcceptTerms() {
    acceptTerms();
    setTermsAccepted(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message ?? "Could not sign in");
      setSubmitting(false);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {!termsAccepted && (
        <Dialog open disablePointerDismissal>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Accept our Privacy Policy and Terms of Service</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
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
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={termsChecked}
                onChange={(e) => setTermsChecked(e.target.checked)}
              />
              I accept Privacy Policy and Terms of Service
            </label>
            <DialogFooter>
              <Button onClick={handleAcceptTerms} disabled={!termsChecked} className="w-full">
                Accept
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {justReset && (
            <p className="rounded-md bg-muted p-2 text-center text-sm">
              Password reset. Please sign in with your new password.
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() =>
              authClient.signIn.social({
                provider: "google",
                callbackURL: "/dashboard",
              })
            }
          >
            Continue with Google
          </Button>
          <div className="relative text-center text-sm text-muted-foreground">
            <span className="bg-card relative z-10 px-2">or</span>
            <div className="absolute inset-x-0 top-1/2 border-t" />
          </div>
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
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <p className="text-right text-sm">
              <Link href="/reset-password" className="text-muted-foreground underline">
                Forgot password?
              </Link>
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/sign-up" className="underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  // useSearchParams needs a Suspense boundary under the App Router.
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <SignInForm />
    </Suspense>
  );
}
