export const adminNavigationItems = [
  {
    href: "/admin/notes",
    icon: "notes",
    label: "Notes",
  },
  {
    href: "/admin/account",
    icon: "account",
    label: "Account",
  },
] as const;

export function isAdminNavigationItemActive(
  pathname: string,
  href: (typeof adminNavigationItems)[number]["href"],
) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
