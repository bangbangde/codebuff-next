export const adminNavigationItems = [
  {
    href: "/admin/articles",
    icon: "articles",
    label: "Articles",
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
