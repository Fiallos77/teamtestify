"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { OrgSwitcher } from "@/components/dashboard/org-switcher";
import { UserMenu } from "@/components/dashboard/user-menu";
import { SpaceQuickMenu } from "@/components/dashboard/space-quick-menu";
import { isUpgradeError } from "@/components/dashboard/upgrade-cta";
import { PlanLimitUpgradeAlert } from "@/components/dashboard/plan-limit-upgrade-alert";
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
import { ArrowLeft, Inbox, LayoutGrid, Menu, Plus, Settings, Share2, X } from "lucide-react";

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
          {error &&
            (isUpgradeError(error) ? (
              <PlanLimitUpgradeAlert title="Space limit reached" message={error} />
            ) : (
              <p className="text-sm text-destructive">{error}</p>
            ))}
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
                "group/space-row flex items-center gap-1 rounded-lg pr-1",
                active
                  ? "bg-sidebar-primary/18 font-medium text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/62 hover:bg-sidebar-accent hover:text-sidebar-foreground"
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
    { href: base, label: "Inbox", icon: Inbox, showDot: !!pendingCount },
    { href: `${base}/widgets`, label: "Widgets", icon: LayoutGrid },
    { href: `${base}/settings`, label: "Settings", icon: Settings },
    { href: `${base}/share`, label: "Share", icon: Share2 },
  ];

  return (
    <>
      <div className="p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-sidebar-foreground/62 hover:text-sidebar-foreground"
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
                "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm",
                active
                  ? "bg-sidebar-primary/18 font-medium text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/62 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <span className="flex items-center gap-2.5">
                <section.icon className="size-4" />
                {section.label}
              </span>
              {section.showDot && (
                <span
                  aria-label="New submissions waiting"
                  className="size-2 shrink-0 rounded-full bg-destructive"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

// Shared body for both the always-visible desktop rail and the mobile
// disclosure drawer below — same content, rendered in whichever one is
// visible at the current breakpoint, so there's exactly one implementation
// of the sidebar's contents even though there are two containers.
function SidebarContent({ spaceId }: { spaceId: Id<"spaces"> | undefined }) {
  return (
    <>
      <div className="space-y-3 border-b p-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-base font-extrabold text-primary-foreground">
            T
          </span>
          <span className="truncate font-heading text-[15px] font-bold">Testimonial Studio</span>
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
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const spaceMatch = pathname.match(/^\/dashboard\/spaces\/([^/]+)/);
  const spaceId = spaceMatch?.[1] as Id<"spaces"> | undefined;

  // Mobile/tablet (<1024px) nav lives behind this toggle. State-driven
  // (not the earlier <details>/<summary> version) specifically so it can
  // close itself: on navigation, on backdrop click, and via its own X
  // button — none of which a native disclosure can do without JS, and the
  // previous version had no visible way to close it once open (the drawer
  // painted over the hamburger button at the same z-index).
  const [mobileOpen, setMobileOpen] = useState(false);

  // Reset on navigation — covers tapping any sidebar link. Adjusted during
  // render (React's documented pattern for "reset state when a value
  // changes") rather than in an effect, so this doesn't cost an extra
  // render pass after the route change.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
  }

  // Reset if the viewport crosses into desktop width (e.g. rotating a
  // tablet or resizing the window) so the drawer can never be left "open"
  // in state behind the now-hidden mobile UI.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setMobileOpen(false);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      {/* Mobile/tablet (<1024px): collapsed behind a hamburger toggle. */}
      <div className="lg:hidden">
        {!mobileOpen && (
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setMobileOpen(true)}
            className="dark fixed top-2 left-2 z-30 flex size-11 items-center justify-center rounded-lg border bg-sidebar text-sidebar-foreground shadow-md"
          >
            <Menu className="size-5" />
          </button>
        )}

        {mobileOpen && (
          <>
            <div
              aria-hidden="true"
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-foreground/40"
            />
            <aside className="dark fixed inset-y-0 left-0 z-50 flex h-screen w-72 max-w-[85vw] flex-col border-r bg-sidebar text-sidebar-foreground">
              <div className="flex justify-end p-2">
                <button
                  type="button"
                  aria-label="Close navigation menu"
                  onClick={() => setMobileOpen(false)}
                  className="flex size-11 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <X className="size-5" />
                </button>
              </div>
              <SidebarContent spaceId={spaceId} />
            </aside>
          </>
        )}
      </div>

      {/* Desktop (≥1024px): always-visible persistent rail. */}
      <aside className="dark sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
        <SidebarContent spaceId={spaceId} />
      </aside>
    </>
  );
}
