import Link from "next/link";
import { NAV_ANCHOR_LINKS } from "./nav-links";

// Only real, existing destinations — no Terms/Privacy/social links that
// don't have a page behind them yet.
export function Footer() {
  return (
    <footer className="dark border-t border-border bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-foreground/60 sm:flex-row sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary font-heading text-sm font-extrabold text-primary-foreground">
            T
          </span>
          <span className="font-heading text-sm font-bold text-foreground">TeamTestify</span>
          <span className="ml-2">© {new Date().getFullYear()}</span>
        </Link>
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
