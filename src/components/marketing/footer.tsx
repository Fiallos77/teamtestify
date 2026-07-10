import Link from "next/link";
import { NAV_ANCHOR_LINKS } from "./nav-links";

// Only real, existing destinations — no Terms/Privacy/social links that
// don't have a page behind them yet.
export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <p>© {new Date().getFullYear()} TeamTestify</p>
        <nav className="flex flex-wrap items-center justify-center gap-4">
          {NAV_ANCHOR_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </a>
          ))}
          <Link href="/sign-in" className="hover:text-foreground">
            Log in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
