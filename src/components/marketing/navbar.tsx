"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { NAV_ANCHOR_LINKS } from "./nav-links";

export function Navbar() {
  const { data: session } = authClient.useSession();
  const signedIn = !!session?.user;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-semibold">
          TeamTestify
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
              <Button size="sm" nativeButton={false} render={<Link href="/sign-up" />}>
                Start for free
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
