export const adminNavigationItems = [
  {
    href: "/admin",
    icon: "overview",
    label: "Overview",
  },
  {
    href: "/account",
    icon: "account",
    label: "Account",
  },
] as const;

export function isAdminNavigationItemActive(
  pathname: string,
  href: (typeof adminNavigationItems)[number]["href"],
) {
  return pathname === href;
}
