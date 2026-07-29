export const adminNavigationItems = [
  {
    href: "/admin",
    icon: "overview",
    label: "Overview",
  },
  {
    href: "/admin/articles",
    icon: "articles",
    label: "Articles",
  },
  {
    href: "/admin/media",
    icon: "media",
    label: "Media",
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
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
