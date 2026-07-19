// Whether a sidebar nav link should render as active for the current path.
// Exact links (e.g. "/dashboard") match only themselves, since deeper routes
// such as "/dashboard/settings" or "/dashboard/spaces/x" share the prefix;
// non-exact links also match their sub-routes (e.g. "/dashboard/settings"
// stays active on "/dashboard/settings" regardless of a ?tab query, which
// usePathname strips).
export function isNavItemActive(pathname: string, href: string, exact = false): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
