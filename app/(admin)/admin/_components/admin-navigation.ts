export const adminNavigationItems = [
  {
    href: "/admin/notes",
    label: "Notes",
  },
] as const;

export function isAdminNavigationItemActive(
  pathname: string,
  href: (typeof adminNavigationItems)[number]["href"],
) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
