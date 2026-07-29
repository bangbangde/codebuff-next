import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  it("contains only the real Overview and Account destinations", () => {
    assert.deepEqual(
      adminNavigationItems.map(({ href, label }) => ({ href, label })),
      [
        { href: "/admin", label: "Overview" },
        { href: "/account", label: "Account" },
      ],
    );
  });

  it("marks only exact current destinations as active", () => {
    assert.equal(isAdminNavigationItemActive("/admin", "/admin"), true);
    assert.equal(isAdminNavigationItemActive("/account", "/account"), true);
    assert.equal(isAdminNavigationItemActive("/admin/other", "/admin"), false);
    assert.equal(isAdminNavigationItemActive("/", "/admin"), false);
  });

  it("uses deterministic local shell state and an accessible mobile dialog", async () => {
    const shell = await readFile(
      "app/(admin)/admin/_components/admin-shell.tsx",
      "utf8",
    );

    assert.match(shell, /useState\(false\)/);
    assert.doesNotMatch(shell, /localStorage|sessionStorage/);
    assert.match(shell, /aria-controls="admin-sidebar"/);
    assert.match(shell, /aria-expanded=\{!collapsed\}/);
    assert.match(shell, /onOpenChange=\{setMobileNavigationOpen\}/);
    assert.match(shell, /data-open:slide-in-from-left/);
    assert.match(shell, /Skip to Admin content/);
    assert.match(shell, /<Tooltip disabled=\{!collapsed\}/);
    assert.match(shell, /<TooltipContent>\{item\.label\}<\/TooltipContent>/);
    assert.doesNotMatch(shell, /title=\{collapsed \? item\.label/);
    assert.match(shell, /aria-label="Open navigation"[^]*className="size-11/);
    assert.match(shell, /aria-label="Close navigation"[^]*className="size-11/);
    assert.match(shell, /min-h-11 min-w-11/);
  });
});
