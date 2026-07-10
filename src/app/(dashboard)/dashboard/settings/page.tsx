"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function BillingCard() {
  const billing = useQuery(api.subscriptions.getBillingInfo);
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const createPortalSession = useAction(api.stripe.createPortalSession);
  const [loading, setLoading] = useState<"monthly" | "yearly" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justReturned, setJustReturned] = useState<"success" | "cancel" | null>(null);

  useEffect(() => {
    // window isn't available during SSR, so this can only ever run
    // post-hydration on the client — there's no lazy-initializer
    // alternative that would work here.
    const checkout = new URLSearchParams(window.location.search).get("checkout");
    if (checkout === "success" || checkout === "cancel") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJustReturned(checkout);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function handleUpgrade(interval: "monthly" | "yearly") {
    setLoading(interval);
    setError(null);
    try {
      const { url } = await createCheckoutSession({ interval, returnUrl: window.location.href });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(null);
    }
  }

  async function handleManageBilling() {
    setLoading("portal");
    setError(null);
    try {
      const { url } = await createPortalSession({ returnUrl: window.location.href });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(null);
    }
  }

  const renewalDate = billing?.currentPeriodEnd
    ? new Date(billing.currentPeriodEnd * 1000).toLocaleDateString()
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {justReturned === "success" && (
          <p className="rounded-md bg-muted p-2 text-sm">
            Checkout complete — this may take a few seconds to reflect below.
          </p>
        )}
        {justReturned === "cancel" && (
          <p className="rounded-md bg-muted p-2 text-sm text-muted-foreground">
            Checkout canceled — no changes were made.
          </p>
        )}

        {billing === undefined ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div>
              <p className="text-sm text-muted-foreground">Current plan</p>
              <p className="text-lg font-medium capitalize">{billing?.plan ?? "free"}</p>
              {billing?.plan === "pro" && renewalDate && (
                <p className="text-sm text-muted-foreground">Renews {renewalDate}</p>
              )}
              {billing?.plan === "pro" && billing.status !== "active" && (
                <p className="text-sm text-destructive">Billing status: {billing.status}</p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {billing?.plan === "pro" ? (
              <Button onClick={handleManageBilling} disabled={loading !== null}>
                {loading === "portal" ? "Opening…" : "Manage billing"}
              </Button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => handleUpgrade("monthly")} disabled={loading !== null}>
                  {loading === "monthly" ? "Redirecting…" : "Upgrade — $29/mo"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleUpgrade("yearly")}
                  disabled={loading !== null}
                >
                  {loading === "yearly" ? "Redirecting…" : "Upgrade — $290/yr"}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function OrganizationSettingsPage() {
  const org = useQuery(api.organizations.getActive);
  const updateNotificationEmail = useMutation(api.organizations.updateNotificationEmail);

  const [notificationEmail, setNotificationEmail] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Syncs local editable state to the async-loaded org query result —
    // org isn't available on the initial render, so there's nothing to
    // seed a lazy useState initializer with.
    if (!org) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotificationEmail(org.notificationEmail ?? "");
  }, [org]);

  if (!org) return <p className="text-muted-foreground">Loading…</p>;

  async function handleSave() {
    await updateNotificationEmail({ notificationEmail: notificationEmail || undefined });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <BillingCard />

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notification-email">Notification email</Label>
            <p className="text-sm text-muted-foreground">
              We&apos;ll send an email here whenever a new testimonial comes in.
            </p>
            <Input
              id="notification-email"
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave}>Save changes</Button>
        {saved && <span className="text-sm text-muted-foreground">Saved</span>}
      </div>
    </div>
  );
}
