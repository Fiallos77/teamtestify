"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MATRIX: Array<{ label: string; free: string; pro: string }> = [
  { label: "Spaces", free: "1", pro: "5" },
  { label: "Testimonials collected", free: "Unlimited", pro: "Unlimited" },
  { label: "Testimonials published", free: "15 total", pro: "Unlimited" },
  { label: "Video testimonials published", free: "2", pro: "Unlimited" },
  { label: "Max video length", free: "2 min", pro: "3 min" },
  { label: '"Powered by TeamTestify" badge', free: "Yes", pro: "Removable" },
  { label: "Custom domain for collection page", free: "No", pro: "Yes" },
  { label: "Rich snippets (JSON-LD in embed)", free: "No", pro: "Yes" },
  { label: "AI repurposing", free: "No", pro: "100 generations/mo" },
  { label: "Team members", free: "1", pro: "3" },
];

export default function PricingPage() {
  const { data: session } = authClient.useSession();
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade(interval: "monthly" | "yearly") {
    if (!session?.user) return;
    setLoading(interval);
    setError(null);
    try {
      const returnUrl = `${window.location.origin}/dashboard/settings`;
      const { url } = await createCheckoutSession({ interval, returnUrl });
      window.location.href = url;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong starting checkout"
      );
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Simple, transparent pricing</h1>
        <p className="mt-2 text-muted-foreground">
          Collect unlimited testimonials on every plan — upgrade when you&apos;re ready to publish more.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <p className="text-2xl font-semibold">$0</p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Great for getting your first testimonials live.
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Pro</CardTitle>
            <p className="text-2xl font-semibold">
              $29<span className="text-sm font-normal text-muted-foreground">/mo</span>
            </p>
            <p className="text-sm text-muted-foreground">or $290/yr</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {session?.user ? (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => handleUpgrade("monthly")} disabled={loading !== null}>
                  {loading === "monthly" ? "Redirecting…" : "Upgrade monthly"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleUpgrade("yearly")}
                  disabled={loading !== null}
                >
                  {loading === "yearly" ? "Redirecting…" : "Upgrade yearly"}
                </Button>
              </div>
            ) : (
              <Button render={<Link href="/sign-up" />}>Get started</Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left font-medium">Capability</th>
              <th className="p-3 text-left font-medium">Free</th>
              <th className="p-3 text-left font-medium">Pro</th>
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((row) => (
              <tr key={row.label} className="border-t">
                <td className="p-3">{row.label}</td>
                <td className="p-3 text-muted-foreground">{row.free}</td>
                <td className="p-3 text-muted-foreground">{row.pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
