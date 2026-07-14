"use client";

import { ReactNode } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { UserMenu } from "@/components/dashboard/user-menu";
import { OrganizationRequired } from "@/components/dashboard/organization-required";

export function DashboardShell({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  // Skip the query until the Convex client has actually registered the auth
  // token — right after a hard refresh there's a brief window where
  // isAuthenticated is false even though the user has a valid session, and
  // querying too early would misread "not authenticated yet" as "no org",
  // flashing the create-organization screen and letting a click through
  // before the token is ready.
  const activeOrg = useQuery(api.organizations.getActive, isAuthenticated ? {} : "skip");

  if (activeOrg === undefined) {
    return <div className="min-h-screen bg-background text-foreground" />;
  }

  if (!activeOrg) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="flex justify-end p-3">
          <UserMenu />
        </div>
        <OrganizationRequired />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      {/* min-h-0 at every nested flex level below h-screen is required so
          `main` actually scrolls internally (flexbug #1) — without it, a tall
          Inbox list grows this column past the viewport instead of scrolling,
          which drags the whole page (and the sidebar) down with it. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <DashboardTopbar />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
