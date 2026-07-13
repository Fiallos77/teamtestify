"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { OrgSwitcher } from "@/components/dashboard/org-switcher";
import { UserMenu } from "@/components/dashboard/user-menu";
import { SpaceQuickMenu } from "@/components/dashboard/space-quick-menu";
import { ErrorWithUpgradeCta } from "@/components/dashboard/upgrade-cta";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ArrowLeft, Plus, Settings } from "lucide-react";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function NewSpaceDialog() {
  const router = useRouter();
  const createSpace = useMutation(api.spaces.create);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    try {
      const id = await createSpace({
        name,
        description: description || undefined,
        publicSlug: slug,
        formConfig: {
          headline: `Share your experience with ${name}`,
          allowText: true,
          allowVideo: true,
          collectRating: true,
          collectNameCompanyPhoto: true,
          questions: [],
          thankYouMessage: "Thank you for sharing your feedback!",
        },
        branding: {},
      });
      setOpen(false);
      setName("");
      setDescription("");
      setSlug("");
      setSlugEdited(false);
      router.push(`/dashboard/spaces/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="w-full justify-start gap-2" />}>
        <Plus className="size-4" />
        New space
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new space</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="space-name">Name</Label>
            <Input
              id="space-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugEdited) setSlug(slugify(e.target.value));
              }}
              placeholder="Q3 Customer Feedback"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="space-description">Description (optional)</Label>
            <Textarea
              id="space-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this space is for — only visible to your team."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="space-slug">Public URL slug</Label>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>/r/</span>
              <Input
                id="space-slug"
                value={slug}
                onChange={(e) => {
                  setSlug(slugify(e.target.value));
                  setSlugEdited(true);
                }}
              />
            </div>
          </div>
          {error && <ErrorWithUpgradeCta message={error} />}
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={!name || !slug || submitting}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DashboardNav() {
  const pathname = usePathname();
  const spaces = useQuery(api.spaces.list);

  return (
    <>
      <div className="p-3">
        <NewSpaceDialog />
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {spaces === undefined && (
          <p className="px-2 py-1 text-sm text-muted-foreground">Loading…</p>
        )}
        {spaces?.length === 0 && (
          <p className="px-2 py-1 text-sm text-muted-foreground">No spaces yet.</p>
        )}
        {spaces?.map((space) => {
          const href = `/dashboard/spaces/${space._id}`;
          const active = pathname.startsWith(href);
          return (
            <div
              key={space._id}
              className={cn(
                "group/space-row flex items-center gap-1 rounded-md pr-1",
                active
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <Link href={href} className="min-w-0 flex-1 truncate px-2 py-1.5 text-sm">
                {space.name}
              </Link>
              <span className="opacity-0 group-hover/space-row:opacity-100">
                <SpaceQuickMenu space={space} />
              </span>
            </div>
          );
        })}
      </nav>
    </>
  );
}

function SpaceSectionNav({ spaceId }: { spaceId: Id<"spaces"> }) {
  const pathname = usePathname();
  const space = useQuery(api.spaces.get, { spaceId });
  const pendingCount = useQuery(api.testimonials.getPendingCount, { spaceId });
  const base = `/dashboard/spaces/${spaceId}`;
  const sections = [
    { href: base, label: "Inbox", showDot: !!pendingCount },
    { href: `${base}/widgets`, label: "Widgets" },
    { href: `${base}/settings`, label: "Settings" },
    { href: `${base}/branding`, label: "Branding" },
    { href: `${base}/share`, label: "Share" },
  ];

  return (
    <>
      <div className="p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </Link>
        <p className="mt-2 truncate text-sm font-semibold">{space?.name ?? "…"}</p>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {sections.map((section) => {
          const active =
            section.href === base ? pathname === base : pathname.startsWith(section.href);
          return (
            <Link
              key={section.href}
              href={section.href}
              className={cn(
                "flex items-center justify-between rounded-md px-2 py-1.5 text-sm",
                active
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              {section.label}
              {section.showDot && (
                <span
                  aria-label="New submissions waiting"
                  className="size-2 shrink-0 rounded-full bg-red-500"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const spaceMatch = pathname.match(/^\/dashboard\/spaces\/([^/]+)/);
  const spaceId = spaceMatch?.[1] as Id<"spaces"> | undefined;

  return (
    <aside className="dark flex h-screen w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="space-y-2 border-b p-3">
        <Link href="/dashboard" className="block truncate font-semibold">
          Testimonial Studio
        </Link>
        <OrgSwitcher />
      </div>

      {spaceId ? <SpaceSectionNav spaceId={spaceId} /> : <DashboardNav />}

      <div className="flex items-center justify-between border-t p-3">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon" aria-label="Organization settings">
            <Settings className="size-4" />
          </Button>
        </Link>
        <UserMenu />
      </div>
    </aside>
  );
}
