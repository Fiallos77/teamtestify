"use client";

import { usePathname } from "next/navigation";

// Reuses the exact section labels already shown in the sidebar
// (SpaceSectionNav in sidebar.tsx) — kept as a small standalone mapping
// here rather than a shared export, since it's only 5 entries and the two
// components render this text in different contexts (nav link vs. page
// heading).
const SPACE_SECTION_LABELS: Array<{ suffix: string; label: string }> = [
  { suffix: "/inbox", label: "Inbox" },
  { suffix: "/widgets", label: "Widgets" },
  { suffix: "/settings", label: "Settings" },
  { suffix: "/share", label: "Share" },
];

function getTitle(pathname: string): string {
  const spaceMatch = pathname.match(/^\/dashboard\/spaces\/([^/]+)(.*)$/);
  if (spaceMatch) {
    const [, segment, rest] = spaceMatch;
    if (segment === "new") return "New space";
    const section = SPACE_SECTION_LABELS.find((s) => (rest ?? "").startsWith(s.suffix));
    // The bare /dashboard/spaces/[id] route is the space Overview.
    return section?.label ?? "Overview";
  }
  if (pathname === "/dashboard/settings") return "Account settings";
  return "Dashboard";
}

export function DashboardTopbar() {
  const pathname = usePathname();
  return (
    <div className="flex h-14 shrink-0 items-center border-b bg-background/90 pr-4 pl-16 backdrop-blur sm:pr-6 lg:px-6">
      <h1 className="font-heading text-lg font-bold tracking-tight">{getTitle(pathname)}</h1>
    </div>
  );
}
