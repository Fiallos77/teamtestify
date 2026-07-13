"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { NAV_ANCHOR_LINKS } from "./nav-links";

export function Navbar() {
  const { data: session } = authClient.useSession();
  const signedIn = !!session?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary font-heading text-base font-extrabold text-primary-foreground">
            T
          </span>
          <span className="font-heading text-[17px] font-bold tracking-tight">TeamTestify</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {NAV_ANCHOR_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {signedIn ? (
            <Button size="sm" nativeButton={false} render={<Link href="/dashboard" />}>
              Go to dashboard
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                nativeButton={false}
                render={<Link href="/sign-in" />}
              >
                Log in
              </Button>
              <Button size="sm" variant="cta" nativeButton={false} render={<Link href="/sign-up" />}>
                Start for free
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
