export const adminNavigationItems = [
  {
    href: "/admin/home",
    label: "首页内容",
    lang: "zh-CN",
  },
  {
    href: "/admin/notes",
    label: "Notes",
    lang: "en",
  },
] as const;

export function isAdminNavigationItemActive(
  pathname: string,
  href: (typeof adminNavigationItems)[number]["href"],
) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
