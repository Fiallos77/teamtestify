"use client";

import { ReactNode } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { UserMenu } from "@/components/dashboard/user-menu";
import { OrganizationRequired } from "@/components/dashboard/organization-required";
import { TermsAcceptanceRequired } from "@/components/dashboard/terms-acceptance-required";

export function DashboardShell({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  // Skip these queries until the Convex client has actually registered the
  // auth token — right after a hard refresh there's a brief window where
  // isAuthenticated is false even though the user has a valid session, and
  // querying too early would misread "not authenticated yet" as "hasn't
  // accepted" / "no org", flashing the wrong gate and letting a click
  // through before the token is ready.
  const hasAcceptedTerms = useQuery(api.userSettings.hasAcceptedTerms, isAuthenticated ? {} : "skip");
  const activeOrg = useQuery(api.organizations.getActive, isAuthenticated ? {} : "skip");

  if (hasAcceptedTerms === undefined || activeOrg === undefined) {
    return <div className="min-h-screen bg-background text-foreground" />;
  }

  // Account-level gate: covers every sign-up path (email form, Google OAuth,
  // which never touches the /sign-up form at all) and every device — once
  // accepted here, it never asks again anywhere.
  if (!hasAcceptedTerms) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="flex justify-end p-3">
          <UserMenu />
        </div>
        <TermsAcceptanceRequired />
      </div>
    );
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
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
