"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function OrganizationRequired() {
  const createOrganization = useMutation(api.organizations.create);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const slug = `${slugify(name)}-${Date.now().toString(36)}`;
      await createOrganization({ name, slug });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create organization");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 pt-12 text-center">
      <div>
        <h1 className="text-xl font-semibold">Create your organization</h1>
        <p className="text-muted-foreground">
          Testimonials, spaces, and widgets are managed per organization.
        </p>
      </div>
      <form
        onSubmit={handleCreate}
        className="flex w-full max-w-sm flex-col gap-3 text-left"
      >
        <div className="space-y-2">
          <Label htmlFor="org-name">Organization name</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Inc."
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting || !name.trim()}>
          {submitting ? "Creating…" : "Create organization"}
        </Button>
      </form>
    </div>
  );
}
