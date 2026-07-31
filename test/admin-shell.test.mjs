import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { describe, it } from "node:test";

import {
  adminNavigationItems,
  isAdminNavigationItemActive,
} from "../app/(admin)/admin/_components/admin-navigation.ts";
import {
  hasAdminRole,
  USER_ROLE,
  userRoleField,
} from "../lib/auth/admin-policy.ts";

describe("Admin authorization policy", () => {
  it("denies every role except the explicit admin role", () => {
    assert.equal(hasAdminRole(USER_ROLE.ADMIN), true);
    assert.equal(hasAdminRole(USER_ROLE.USER), false);
    assert.equal(hasAdminRole("owner"), false);
    assert.equal(hasAdminRole(undefined), false);
    assert.equal(hasAdminRole(null), false);
  });

  it("keeps new user roles server-owned and non-admin by default", () => {
    assert.deepEqual(userRoleField, {
      type: "string",
      required: true,
      defaultValue: USER_ROLE.USER,
      input: false,
    });
  });

  it("protects the Admin route group through the centralized DAL", async () => {
    const layout = await readFile("app/(admin)/admin/layout.tsx", "utf8");
    const session = await readFile("lib/auth/session.ts", "utf8");

    assert.match(layout, /const session = await requireAdmin\(\)/);
    assert.doesNotMatch(layout, /requireCurrentSession/);
    assert.doesNotMatch(layout, /<Suspense/);
    assert.match(
      layout,
      /Resolve authorization before any Suspense boundary can stream a 200/,
    );
    assert.match(session, /export async function requireAdmin\(\)/);
    assert.match(session, /hasAdminRole\(session\.user\.role\)/);
    assert.match(session, /forbidden\(\)/);
  });

  it("migrates only the established single-account installation", async () => {
    const migration = await readFile(
      "drizzle/0001_nebulous_fabian_cortez.sql",
      "utf8",
    );
    const bootstrap = await readFile("scripts/bootstrap-auth-user.mjs", "utf8");

    assert.match(
      migration,
      /ADD COLUMN "role" text DEFAULT 'user' NOT NULL/,
    );
    assert.match(migration, /count\(\*\) FROM "user"\) > 1/);
    assert.match(migration, /UPDATE "user" SET "role" = 'admin'/);
    assert.match(bootstrap, /email, role\)/);
    assert.match(bootstrap, /'admin'/);
  });
});

describe("Admin shell navigation", () => {
  it("contains only the Articles and Account destinations", () => {
    assert.deepEqual(
      adminNavigationItems.map(({ href, label }) => ({ href, label })),
      [
        { href: "/admin/articles", label: "Articles" },
        { href: "/admin/account", label: "Account" },
      ],
    );
  });

  it("matches nested product destinations by prefix", () => {
    assert.equal(
      isAdminNavigationItemActive("/admin/account", "/admin/account"),
      true,
    );
    assert.equal(
      isAdminNavigationItemActive(
        "/admin/articles/8db0fca3",
        "/admin/articles",
      ),
      true,
    );
    assert.equal(
      isAdminNavigationItemActive("/admin/articles", "/admin/articles"),
      true,
    );
    assert.equal(
      isAdminNavigationItemActive("/admin/other", "/admin/articles"),
      false,
    );
    assert.equal(
      isAdminNavigationItemActive("/", "/admin/articles"),
      false,
    );
  });

  it("renders an accessible header navigation without sidebar or drawer state", async () => {
    const shell = await readFile(
      "app/(admin)/admin/_components/admin-shell.tsx",
      "utf8",
    );

    // 已移除侧边栏与抽屉：不再有本地状态、Dialog、Tooltip 或折叠控制
    assert.doesNotMatch(shell, /localStorage|sessionStorage/);
    assert.doesNotMatch(shell, /useState/);
    assert.doesNotMatch(shell, /admin-sidebar/);
    assert.doesNotMatch(shell, /Dialog|Tooltip/);
    assert.doesNotMatch(shell, /aria-label="Open navigation"/);
    assert.doesNotMatch(shell, /aria-label="Close navigation"/);
    assert.doesNotMatch(shell, /PanelLeftOpenIcon|PanelLeftCloseIcon|MenuIcon|XIcon/);
    // 导航合并进顶部 header
    assert.match(shell, /aria-label="Admin navigation"/);
    assert.match(shell, /Skip to Admin content/);
    // 当前页通过 aria-current 标记
    assert.match(shell, /aria-current=\{active \? "page" : undefined\}/);
    // 触控目标尺寸保留
    assert.match(shell, /min-h-11 min-w-11/);
  });

  it("owns Account inside Admin without keeping a Site route alias", async () => {
    const accountPage = await readFile(
      "app/(admin)/admin/account/page.tsx",
      "utf8",
    );
    const siteHeader = await readFile(
      "app/(site)/_components/site-header.tsx",
      "utf8",
    );
    const signInForm = await readFile(
      "app/(site)/sign-in/_components/sign-in-form.tsx",
      "utf8",
    );

    await assert.rejects(
      readFile("app/(site)/account/page.tsx", "utf8"),
      /ENOENT/,
    );
    assert.match(accountPage, /const session = await requireAdmin\(\)/);
    assert.doesNotMatch(accountPage, /ContentContainer|requireCurrentSession/);
    assert.doesNotMatch(siteHeader, /Account navigation|href="\/account"/);
    assert.match(signInForm, /"\/admin\/account\?recovery=1"/);
    assert.match(signInForm, /"\/admin\/account"/);
  });

  it("keeps reusable Account behavior independent from either surface", async () => {
    const featureFiles = (
      await readdir("features/account", { recursive: true })
    ).filter((file) => /\.[cm]?[jt]sx?$/.test(file));

    for (const featureFile of featureFiles) {
      const source = await readFile(`features/account/${featureFile}`, "utf8");

      assert.doesNotMatch(source, /@\/app\/\(admin\)|@\/app\/\(site\)/);
    }
  });
});
