"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_MATRIX } from "./plan-matrix";

export function PricingSection() {
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
      setError(e instanceof Error ? e.message : "Something went wrong starting checkout");
      setLoading(null);
    }
  }

  return (
    <section id="pricing" className="border-y bg-muted/30">
      <div className="mx-auto max-w-4xl space-y-10 px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl">Simple, transparent pricing</h2>
          <p className="mt-2 text-muted-foreground">
            Collect unlimited testimonials on every plan — upgrade when you&apos;re ready to
            publish more.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <p className="text-2xl font-semibold">$0</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Great for getting your first testimonials live.
              </p>
              <Button variant="outline" nativeButton={false} render={<Link href="/sign-up" />}>
                Start for free
              </Button>
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
                <Button nativeButton={false} render={<Link href="/sign-up" />}>
                  Get started
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="overflow-x-auto rounded-md border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium">Capability</th>
                <th className="p-3 text-left font-medium">Free</th>
                <th className="p-3 text-left font-medium">Pro</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_MATRIX.map((row) => (
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
    </section>
  );
}
