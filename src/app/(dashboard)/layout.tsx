import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth-server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await isAuthenticated())) redirect("/sign-in");

  return <DashboardShell>{children}</DashboardShell>;
}
