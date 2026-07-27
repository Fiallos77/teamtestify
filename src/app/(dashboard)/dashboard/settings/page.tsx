"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlanUsageCard } from "@/components/dashboard/plan-usage-card";
import { validateChangePassword } from "@/components/dashboard/change-password-validation";
import { BETA_MODE } from "@/lib/beta-mode";

const TABS = ["profile", "plan", "notifications"] as const;
type TabValue = (typeof TABS)[number];

function isTabValue(value: string | null): value is TabValue {
  return value !== null && (TABS as readonly string[]).includes(value);
}

// --- Profile -----------------------------------------------------------------

function ProfileTab() {
  const org = useQuery(api.organizations.getActive);
  const { data: session } = authClient.useSession();
  const updateName = useMutation(api.organizations.updateName);

  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!org) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(org.name);
  }, [org]);

  if (!org) return <p className="text-muted-foreground">Loading…</p>;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateName({ name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="org-name">Organization name</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Inc."
          />
        </div>

        <div className="space-y-2">
          <Label>Signed in as</Label>
          <Input value={session?.user?.email ?? ""} readOnly disabled />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {saved && <span className="text-sm text-muted-foreground">Saved</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const validationError = validateChangePassword({ currentPassword, newPassword, confirmPassword });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    const { error: changeError } = await authClient.changePassword({ currentPassword, newPassword });
    setSubmitting(false);

    if (changeError) {
      setError(changeError.message ?? "Could not change password");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
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
            <Label htmlFor="confirm-new-password">Confirm new password</Label>
            <Input
              id="confirm-new-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Changing…" : "Change"}
            </Button>
            {success && <span className="text-sm text-muted-foreground">Password changed</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// --- Plan --------------------------------------------------------------------

function PlanTab() {
  const billing = useQuery(api.subscriptions.getBillingInfo);
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const createPortalSession = useAction(api.stripe.createPortalSession);
  const [loading, setLoading] = useState<"monthly" | "yearly" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justReturned, setJustReturned] = useState<"success" | "cancel" | null>(null);

  useEffect(() => {
    // window isn't available during SSR, so this can only ever run
    // post-hydration on the client.
    const checkout = new URLSearchParams(window.location.search).get("checkout");
    if (checkout === "success" || checkout === "cancel") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJustReturned(checkout);
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      window.history.replaceState(null, "", url.pathname + url.search);
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

  const isPro = billing?.plan === "pro";
  const renewalDate = billing?.currentPeriodEnd
    ? new Date(billing.currentPeriodEnd * 1000).toLocaleDateString()
    : null;

  return (
    <div className="space-y-6">
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

      <PlanUsageCard />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Free */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Free</CardTitle>
              {!isPro && <Badge variant="secondary">Current plan</Badge>}
            </div>
            <p className="text-3xl font-bold">$0</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>3 spaces</li>
              <li>15 published testimonials (2 video)</li>
              <li>2-minute video length</li>
            </ul>
          </CardContent>
        </Card>

        {/* Pro */}
        {BETA_MODE ? (
          <Card>
            <CardHeader>
              <CardTitle>Pro plan — COMING SOON</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We&apos;re in early access — everyone gets Free plan limits for now. Pro
                pricing will open up once beta wraps.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Pro</CardTitle>
                {isPro && <Badge>Current plan</Badge>}
              </div>
              <p className="text-3xl font-bold">
                $29<span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              <p className="text-sm text-muted-foreground">or $290/yr</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>5 spaces</li>
                <li>Unlimited published testimonials</li>
                <li>3-minute video length</li>
                <li>100 AI generations / month</li>
              </ul>

              {billing === undefined ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : isPro ? (
                <div className="space-y-2">
                  {renewalDate && (
                    <p className="text-sm text-muted-foreground">Renews {renewalDate}</p>
                  )}
                  {billing.status !== "active" && (
                    <p className="text-sm text-destructive">Billing status: {billing.status}</p>
                  )}
                  <Button onClick={handleManageBilling} disabled={loading !== null}>
                    {loading === "portal" ? "Opening…" : "Manage billing"}
                  </Button>
                </div>
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
            </CardContent>
          </Card>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        See the full comparison on our{" "}
        <Link href="/#pricing" className="underline">
          pricing page
        </Link>
        .
      </p>
    </div>
  );
}

// --- Notifications -----------------------------------------------------------

function NotificationsTab() {
  const org = useQuery(api.organizations.getActive);
  const updateNotificationEmail = useMutation(api.organizations.updateNotificationEmail);

  const [notificationEmail, setNotificationEmail] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
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

        <div className="flex items-center gap-3">
          <Button onClick={handleSave}>Save changes</Button>
          {saved && <span className="text-sm text-muted-foreground">Saved</span>}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Page --------------------------------------------------------------------

function AccountSettings() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const defaultTab: TabValue = isTabValue(requestedTab) ? requestedTab : "profile";

  return (
    <div className="max-w-2xl">
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4 pt-4">
          <ProfileTab />
          <ChangePasswordCard />
        </TabsContent>
        <TabsContent value="plan" className="pt-4">
          <PlanTab />
        </TabsContent>
        <TabsContent value="notifications" className="pt-4">
          <NotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AccountSettingsPage() {
  // useSearchParams needs a Suspense boundary under the App Router.
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <AccountSettings />
    </Suspense>
  );
}
