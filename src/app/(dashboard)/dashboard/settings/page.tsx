"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OrganizationSettingsPage() {
  const org = useQuery(api.organizations.getActive);
  const updateNotificationEmail = useMutation(api.organizations.updateNotificationEmail);

  const [notificationEmail, setNotificationEmail] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!org) return;
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
