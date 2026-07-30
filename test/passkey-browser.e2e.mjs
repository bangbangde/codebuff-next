import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import { fileURLToPath } from "node:url";

import pg from "pg";
import { chromium } from "playwright-core";

const { Client } = pg;

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const nextCli = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);
const testDatabaseName =
  `codebuff_passkey_e2e_${process.pid}_${Date.now()}`.toLowerCase();
const testEmail = "passkey-e2e@codebuff.local";
const testPassword = "Passkey-E2E-Local-Password-2026!";
const initialPasskeyName = "E2E platform passkey";
const renamedPasskeyName = "Renamed E2E passkey";
const authenticationOptionsPath =
  "/api/auth/passkey/generate-authenticate-options";
const authenticationVerificationPath =
  "/api/auth/passkey/verify-authentication";
const registrationOptionsPath =
  "/api/auth/passkey/generate-register-options";
const registrationVerificationPath =
  "/api/auth/passkey/verify-registration";

let browser;
let page;
let server;
let serverLog = "";
let databaseCreated = false;

function databaseConfig(database) {
  return {
    host: process.env.PG_HOST?.trim() || "127.0.0.1",
    port: Number(process.env.PG_PORT?.trim() || "5432"),
    user: process.env.PG_USER?.trim() || "codebuff",
    password: process.env.PG_PWD || "codebuff",
    database,
    connectionTimeoutMillis: Number(
      process.env.PG_CONNECTION_TIMEOUT_MS?.trim() || "10000",
    ),
  };
}

async function usingDatabase(database, callback) {
  const client = new Client(databaseConfig(database));

  try {
    await client.connect();
    return await callback(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function createTestDatabase() {
  assert.match(testDatabaseName, /^[a-z0-9_]+$/);

  await usingDatabase(
    process.env.PG_MAINTENANCE_DB?.trim() || "postgres",
    (client) => client.query(`CREATE DATABASE "${testDatabaseName}"`),
  );
  databaseCreated = true;
}

async function dropTestDatabase() {
  if (!databaseCreated) {
    return;
  }

  await usingDatabase(
    process.env.PG_MAINTENANCE_DB?.trim() || "postgres",
    async (client) => {
      await client.query(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
        [testDatabaseName],
      );
      await client.query(`DROP DATABASE IF EXISTS "${testDatabaseName}"`);
    },
  );
  databaseCreated = false;
}

async function runNode(label, arguments_, environment) {
  const child = spawn(process.execPath, arguments_, {
    cwd: projectRoot,
    env: environment,
    stdio: "inherit",
    windowsHide: true,
  });
  const [exitCode] = await once(child, "exit");

  if (exitCode !== 0) {
    throw new Error(`${label} exited with code ${exitCode}`);
  }
}

function captureServerOutput(stream) {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    serverLog = `${serverLog}${chunk}`.slice(-30_000);
  });
}

async function reservePort() {
  const listener = net.createServer();
  listener.unref();
  await new Promise((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolve);
  });
  const address = listener.address();
  assert(address && typeof address === "object");
  const { port } = address;
  await new Promise((resolve, reject) => {
    listener.close((error) => (error ? reject(error) : resolve()));
  });
  return port;
}

async function waitForServer(baseURL) {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    if (server.exitCode !== null || server.signalCode !== null) {
      throw new Error(
        `Next.js exited before becoming ready.\n${serverLog}`,
      );
    }

    try {
      const response = await fetch(`${baseURL}/sign-in`);

      if (response.ok) {
        return;
      }
    } catch {
      // The server is still compiling or has not bound its port yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Next.js did not become ready.\n${serverLog}`);
}

async function stopServer() {
  if (
    !server ||
    server.exitCode !== null ||
    server.signalCode !== null
  ) {
    return;
  }

  server.kill("SIGTERM");
  await Promise.race([
    once(server, "exit"),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);

  if (server.exitCode === null && server.signalCode === null) {
    server.kill("SIGKILL");
    await once(server, "exit").catch(() => undefined);
  }
}

function waitForApiResponse(pathname) {
  return page.waitForResponse(
    (response) => new URL(response.url()).pathname === pathname,
    { timeout: 30_000 },
  );
}

async function setTestUserTwoFactorEnabled(enabled) {
  await usingDatabase(testDatabaseName, (client) =>
    client.query(
      'UPDATE "user" SET "two_factor_enabled" = $1 WHERE "email" = $2',
      [enabled, testEmail],
    ),
  );
}

async function setTestUserRole(role) {
  await usingDatabase(testDatabaseName, (client) =>
    client.query('UPDATE "user" SET "role" = $1 WHERE "email" = $2', [
      role,
      testEmail,
    ]),
  );
}

async function ageCurrentSessions() {
  await usingDatabase(testDatabaseName, (client) =>
    client.query(
      'UPDATE "session" SET "created_at" = NOW() - INTERVAL \'20 minutes\'',
    ),
  );
}

async function removeCredentialPassword() {
  return usingDatabase(testDatabaseName, async (client) => {
    const result = await client.query(
      'SELECT "password" FROM "account" WHERE "provider_id" = $1',
      ["credential"],
    );
    const password = result.rows[0]?.password;
    assert.equal(typeof password, "string");
    assert(password.length > 0);

    await client.query(
      'UPDATE "account" SET "password" = NULL WHERE "provider_id" = $1',
      ["credential"],
    );
    return password;
  });
}

async function restoreCredentialPassword(password) {
  await usingDatabase(testDatabaseName, (client) =>
    client.query(
      'UPDATE "account" SET "password" = $1 WHERE "provider_id" = $2',
      [password, "credential"],
    ),
  );
}

async function passkeyRowCount() {
  return usingDatabase(testDatabaseName, async (client) => {
    const result = await client.query(
      'SELECT COUNT(*)::integer AS "count" FROM "passkey"',
    );
    return result.rows[0].count;
  });
}

async function assertMinimumTouchTarget(locator, label) {
  const box = await locator.boundingBox();

  assert.ok(box, `${label} must have a rendered bounding box`);
  assert.ok(
    box.width >= 44 && box.height >= 44,
    `${label} must be at least 44px by 44px; received ${box.width}px by ${box.height}px`,
  );
}

async function assertAdminShell(baseURL, colorScheme) {
  await page.emulateMedia({ colorScheme });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${baseURL}/admin`);
  await page
    .getByRole("heading", { name: "管理工作从这里开始。" })
    .waitFor();
  await page.waitForFunction((expectedColorScheme) => {
    const dark = document.documentElement.classList.contains("dark");
    return expectedColorScheme === "dark" ? dark : !dark;
  }, colorScheme);
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme),
    colorScheme,
  );
  assert.equal(
    await page.locator("header").evaluate((element) => {
      return getComputedStyle(element).position;
    }),
    "fixed",
  );
  assert.equal(
    await page.locator("#admin-sidebar").evaluate((element) => {
      return getComputedStyle(element).width;
    }),
    "256px",
  );

  const collapseSidebar = page.getByRole("button", {
    name: "Collapse sidebar",
    exact: true,
  });
  await assertMinimumTouchTarget(collapseSidebar, "Desktop sidebar toggle");
  await collapseSidebar.click();
  await page
    .getByRole("button", { name: "Expand sidebar", exact: true })
    .waitFor();
  await page.waitForFunction(() => {
    const sidebar = document.querySelector("#admin-sidebar");
    return sidebar && getComputedStyle(sidebar).width === "72px";
  });
  assert.equal(
    await page.locator("#admin-sidebar").evaluate((element) => {
      return getComputedStyle(element).width;
    }),
    "72px",
  );

  const overviewLink = page.getByRole("link", {
    name: "Overview",
    exact: true,
  });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  assert.equal(
    await overviewLink.evaluate(
      (element) => element === document.activeElement,
    ),
    true,
  );
  await page.getByRole("tooltip").filter({ hasText: "Overview" }).waitFor();

  await page.setViewportSize({ width: 375, height: 800 });
  const openNavigation = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  const viewSite = page.getByRole("link", {
    name: "View site",
    exact: true,
  });
  await assertMinimumTouchTarget(openNavigation, "Mobile navigation trigger");
  await assertMinimumTouchTarget(viewSite, "Mobile View site link");

  await openNavigation.click();
  const navigationDialog = page.getByRole("dialog");
  await navigationDialog.waitFor();
  await page.waitForFunction(() => {
    const dialog = document.querySelector('[data-slot="dialog-content"]');
    return dialog?.contains(document.activeElement);
  });
  assert.equal(
    await navigationDialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
    true,
  );
  await assertMinimumTouchTarget(
    page.getByRole("button", { name: "Close navigation", exact: true }),
    "Mobile navigation close button",
  );
  await page.keyboard.press("Escape");
  await navigationDialog.waitFor({ state: "hidden" });
  assert.equal(
    await openNavigation.evaluate(
      (element) => element === document.activeElement,
    ),
    true,
  );

  await openNavigation.click();
  await navigationDialog.waitFor();
  await page.mouse.click(370, 400);
  await navigationDialog.waitFor({ state: "hidden" });
  assert.equal(
    await openNavigation.evaluate(
      (element) => element === document.activeElement,
    ),
    true,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
}

async function signIn(baseURL) {
  await page.goto(`${baseURL}/sign-in`);
  await page.getByLabel("Email", { exact: true }).fill(testEmail);
  await page.getByLabel("Password", { exact: true }).fill(testPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`${baseURL}/admin/account`);
}

async function assertAdminAccount(baseURL, colorScheme) {
  await page.emulateMedia({ colorScheme });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${baseURL}/admin/account`);
  await page.getByRole("heading", { name: "Account", exact: true }).waitFor();
  await page.waitForFunction((expectedColorScheme) => {
    const dark = document.documentElement.classList.contains("dark");
    return expectedColorScheme === "dark" ? dark : !dark;
  }, colorScheme);

  const accountNavigation = page.getByRole("link", {
    name: "Account",
    exact: true,
  });
  assert.equal(await accountNavigation.getAttribute("aria-current"), "page");
  await assertMinimumTouchTarget(
    page.getByRole("button", { name: "Sign out", exact: true }),
    "Account sign-out button",
  );

  await page.setViewportSize({ width: 375, height: 800 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
}

async function createArticleThroughUi(baseURL, article) {
  await page.goto(`${baseURL}/admin/articles/new`);
  await page.getByLabel("标题", { exact: true }).fill(article.title);
  await page.getByLabel("Slug", { exact: true }).fill(article.slug);
  await page.getByLabel("摘要", { exact: false }).fill(article.summary);
  await page.getByLabel("类型", { exact: true }).fill(article.kind);
  const body = page.getByLabel("Markdown 正文", { exact: false });
  await body.fill(article.bodyMarkdown);

  await page
    .getByRole("button", { name: "保存未发布文章", exact: true })
    .click();
  await page.waitForURL(`${baseURL}/admin/articles?created=1`);
  await page
    .getByText("文章已保存到 PostgreSQL，目前仍处于未发布状态。", {
      exact: true,
    })
    .waitFor();
}

async function deleteCurrentArticle(baseURL, title) {
  await page
    .getByRole("button", { name: "删除文章", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.getByText(`你将删除“${title}”`, { exact: false }).waitFor();
  await dialog
    .getByRole("button", { name: "永久删除", exact: true })
    .click();
  await page.waitForURL(`${baseURL}/admin/articles?deleted=1`);
}

async function assertArticleManagement(baseURL, context) {
  const firstArticle = {
    bodyMarkdown: "# 第一篇\n\n保存在 PostgreSQL 中。",
    kind: "工程札记",
    slug: "article-e2e-first",
    summary: "用于验证文章管理闭环。",
    title: "Article E2E First",
  };
  const secondArticle = {
    bodyMarkdown: "# 第二篇",
    kind: "测试记录",
    slug: "article-e2e-second",
    summary: "用于验证重复 slug。",
    title: "Article E2E Second",
  };

  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${baseURL}/admin/articles`);
  await page.getByRole("heading", { name: "文章管理", exact: true }).waitFor();
  await page.getByText("还没有文章", { exact: true }).waitFor();

  await createArticleThroughUi(baseURL, firstArticle);
  await createArticleThroughUi(baseURL, secondArticle);

  await page
    .getByRole("link", { name: secondArticle.title, exact: true })
    .click();
  await page.getByRole("heading", { name: "编辑文章", exact: true }).waitFor();
  await page.getByLabel("Slug", { exact: true }).fill(firstArticle.slug);
  await page
    .getByRole("button", { name: "保存更改", exact: true })
    .click();
  await page
    .getByText("这个 slug 已被其他文章使用。", { exact: true })
    .waitFor();
  assert.equal(
    await page.getByLabel("Slug", { exact: true }).inputValue(),
    firstArticle.slug,
  );

  await deleteCurrentArticle(baseURL, secondArticle.title);
  await page
    .getByText("未发布文章已从 PostgreSQL 永久删除。", { exact: true })
    .waitFor();

  await page
    .getByRole("link", { name: firstArticle.title, exact: true })
    .click();
  await page.waitForURL(/\/admin\/articles\/[^/?]+$/);
  await page.getByRole("heading", { name: "编辑文章", exact: true }).waitFor();
  const stalePage = await context.newPage();
  await stalePage.goto(page.url());
  await stalePage
    .getByRole("heading", { name: "编辑文章", exact: true })
    .waitFor();

  const updatedTitle = "Article E2E First Updated";
  await page.getByLabel("标题", { exact: true }).fill(updatedTitle);
  await page
    .getByRole("button", { name: "保存更改", exact: true })
    .click();
  await page.waitForURL(/\/admin\/articles\/[^/?]+\?saved=1$/);
  await page
    .getByText("更改已保存，文章仍处于未发布状态。", { exact: true })
    .waitFor();

  const staleSummary = "这个值必须在冲突后继续保留。";
  await stalePage.getByLabel("摘要", { exact: false }).fill(staleSummary);
  await stalePage
    .getByRole("button", { name: "保存更改", exact: true })
    .click();
  await stalePage
    .getByText("数据库中的文章已被其他操作更新。", { exact: false })
    .waitFor();
  assert.equal(
    await stalePage.getByLabel("摘要", { exact: false }).inputValue(),
    staleSummary,
  );

  await stalePage
    .getByRole("button", { name: "删除文章", exact: true })
    .click();
  const staleDeleteDialog = stalePage.getByRole("dialog");
  await staleDeleteDialog
    .getByRole("button", { name: "永久删除", exact: true })
    .click();
  await staleDeleteDialog
    .getByText("当前删除请求已拒绝", { exact: false })
    .waitFor();
  await stalePage.close();

  await page.setViewportSize({ width: 375, height: 800 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForFunction(
    () => document.documentElement.classList.contains("dark"),
  );
  await page.getByRole("heading", { name: "编辑文章", exact: true }).waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );

  const deleteTrigger = page.getByRole("button", {
    name: "删除文章",
    exact: true,
  });
  await deleteTrigger.click();
  const deleteDialog = page.getByRole("dialog");
  await deleteDialog.waitFor();
  await page.waitForFunction(() => {
    const dialog = document.querySelector('[role="dialog"]');
    return dialog?.contains(document.activeElement);
  });
  assert.equal(
    await deleteDialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
    true,
  );
  await page.keyboard.press("Escape");
  await deleteDialog.waitFor({ state: "hidden" });
  assert.equal(
    await deleteTrigger.evaluate(
      (element) => element === document.activeElement,
    ),
    true,
  );

  await deleteCurrentArticle(baseURL, updatedTitle);
  await page.getByText("还没有文章", { exact: true }).waitFor();
}

async function runBrowserScenario(baseURL) {
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL?.trim() || "chrome",
    headless: true,
  });
  const context = await browser.newContext();
  page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send(
    "WebAuthn.addVirtualAuthenticator",
    {
      options: {
        protocol: "ctap2",
        ctap2Version: "ctap2_1",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        automaticPresenceSimulation: true,
        isUserVerified: true,
      },
    },
  );

  await signIn(baseURL);

  await assertAdminAccount(baseURL, "light");
  await assertAdminAccount(baseURL, "dark");
  await assertAdminShell(baseURL, "light");
  await assertAdminShell(baseURL, "dark");
  await assertArticleManagement(baseURL, context);

  await setTestUserRole("user");
  await context.clearCookies();
  await signIn(baseURL);
  const forbiddenResponse = await page.goto(`${baseURL}/admin`);
  assert.equal(forbiddenResponse?.status(), 403);
  await page
    .getByRole("heading", { name: "当前账户没有后台权限" })
    .waitFor();

  await setTestUserRole("admin");
  await context.clearCookies();
  await signIn(baseURL);
  await page.setViewportSize({ width: 1280, height: 720 });
  const legacyAccountResponse = await page.goto(`${baseURL}/account`);
  assert.equal(legacyAccountResponse?.status(), 404);
  assert.equal(new URL(page.url()).pathname, "/account");

  await page.goto(`${baseURL}/admin/account`);
  await page
    .getByRole("heading", { name: "Registered passkeys" })
    .waitFor();
  await page
    .getByLabel("Name (optional)", { exact: true })
    .fill(initialPasskeyName);
  await page
    .getByLabel("Authenticator", { exact: true })
    .selectOption("platform");

  const registrationOptionsResponse = waitForApiResponse(
    registrationOptionsPath,
  );
  const registrationVerificationResponse = waitForApiResponse(
    registrationVerificationPath,
  );
  await page
    .getByRole("button", { name: "Register passkey", exact: true })
    .click();

  const [registrationOptions, registrationVerification] =
    await Promise.all([
      registrationOptionsResponse,
      registrationVerificationResponse,
    ]);
  assert.equal(registrationOptions.ok(), true);
  assert.equal(registrationVerification.ok(), true);
  assert.equal(
    (await registrationOptions.json()).authenticatorSelection
      .userVerification,
    "required",
  );
  await page
    .getByText("Passkey 已注册，可以用于下次登录。", { exact: true })
    .waitFor();
  await page.getByText(initialPasskeyName, { exact: true }).waitFor();
  assert.equal(await passkeyRowCount(), 1);

  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await page
    .getByLabel("Passkey name", { exact: true })
    .fill(renamedPasskeyName);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByText("Passkey 名称已更新。", { exact: true })
    .waitFor();
  await page.getByText(renamedPasskeyName, { exact: true }).waitFor();

  await ageCurrentSessions();
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await page
    .getByLabel("Passkey name", { exact: true })
    .fill("This rename must be rejected");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByText(
      "当前登录已超过 10 分钟。请退出并重新登录后再更改 Passkey。",
      { exact: true },
    )
    .waitFor();

  await setTestUserTwoFactorEnabled(true);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.waitForURL(`${baseURL}/sign-in`);

  await page.getByLabel("Email", { exact: true }).fill(testEmail);
  await page.getByLabel("Password", { exact: true }).fill(testPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByLabel("Authentication code", { exact: true })
    .waitFor();
  await page.goto(`${baseURL}/sign-in`);

  await cdp.send("WebAuthn.setResponseOverrideBits", {
    authenticatorId,
    isBadUV: true,
    isBadUP: false,
    isBogusSignature: false,
  });
  const rejectedOptionsResponse = waitForApiResponse(
    authenticationOptionsPath,
  );
  const rejectedVerificationResponse = waitForApiResponse(
    authenticationVerificationPath,
  );
  await page
    .getByRole("button", {
      name: "Sign in with a passkey",
      exact: true,
    })
    .click();

  const [rejectedOptions, rejectedVerification] = await Promise.all([
    rejectedOptionsResponse,
    rejectedVerificationResponse,
  ]);
  assert.equal(rejectedOptions.ok(), true);
  assert.equal(
    (await rejectedOptions.json()).userVerification,
    "required",
  );
  assert.equal(rejectedVerification.ok(), false);
  await page
    .getByText(
      "无法使用 Passkey 登录，请重试或改用邮箱和密码。",
      { exact: true },
    )
    .waitFor();
  assert.equal(new URL(page.url()).pathname, "/sign-in");

  await cdp.send("WebAuthn.setResponseOverrideBits", {
    authenticatorId,
    isBadUV: false,
    isBadUP: false,
    isBogusSignature: false,
  });
  const successfulOptionsResponse = waitForApiResponse(
    authenticationOptionsPath,
  );
  const successfulVerificationResponse = waitForApiResponse(
    authenticationVerificationPath,
  );
  await page
    .getByRole("button", {
      name: "Sign in with a passkey",
      exact: true,
    })
    .click();

  const [successfulOptions, successfulVerification] = await Promise.all([
    successfulOptionsResponse,
    successfulVerificationResponse,
  ]);
  assert.equal(successfulOptions.ok(), true);
  assert.equal(
    (await successfulOptions.json()).userVerification,
    "required",
  );
  assert.equal(successfulVerification.ok(), true);
  await page.waitForURL(`${baseURL}/admin/account`);
  await page
    .getByRole("heading", { name: "TOTP enabled", exact: true })
    .waitFor();
  await page.getByText(renamedPasskeyName, { exact: true }).waitFor();

  const credentialPassword = await removeCredentialPassword();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await page
    .getByRole("button", { name: "Remove passkey", exact: true })
    .click();
  await page
    .getByText(
      "无法移除账户最后一个可用的登录方式。",
      { exact: true },
    )
    .waitFor();
  assert.equal(await passkeyRowCount(), 1);

  await restoreCredentialPassword(credentialPassword);
  await page
    .getByRole("button", { name: "Remove passkey", exact: true })
    .click();
  await page.getByText("Passkey 已移除。", { exact: true }).waitFor();
  await page
    .getByText("还没有注册 Passkey。密码和 TOTP 登录方式不会因注册 Passkey", {
      exact: false,
    })
    .waitFor();
  assert.equal(await passkeyRowCount(), 0);

  await cdp.send("WebAuthn.removeVirtualAuthenticator", {
    authenticatorId,
  });
  await cdp.send("WebAuthn.disable");
}

async function main() {
  const port = await reservePort();
  const baseURL = `http://localhost:${port}`;
  const testEnvironment = {
    ...process.env,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    PG_DB: testDatabaseName,
    BETTER_AUTH_URL: baseURL,
    PASSKEY_RP_ID: "localhost",
    BETTER_AUTH_SECRETS:
      "0:passkey-e2e-only-secret-with-at-least-32-characters",
    AUTH_BOOTSTRAP_NAME: "Passkey E2E User",
    AUTH_BOOTSTRAP_EMAIL: testEmail,
    AUTH_BOOTSTRAP_PASSWORD: testPassword,
  };

  console.log("Creating isolated PostgreSQL database...");
  await createTestDatabase();
  await runNode(
    "Next.js build",
    [nextCli, "build"],
    testEnvironment,
  );
  await runNode(
    "Runtime-tool build",
    ["scripts/build-runtime-tools.mjs"],
    testEnvironment,
  );
  await runNode(
    "Database migration",
    [".build/runtime-tools/db/migrate.cjs"],
    testEnvironment,
  );
  await runNode(
    "Account bootstrap",
    ["scripts/bootstrap-auth-user.mjs"],
    testEnvironment,
  );

  console.log("Starting isolated production server...");
  server = spawn(
    process.execPath,
    [
      nextCli,
      "start",
      "--hostname",
      "localhost",
      "--port",
      String(port),
    ],
    {
      cwd: projectRoot,
      env: testEnvironment,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  captureServerOutput(server.stdout);
  captureServerOutput(server.stderr);
  await waitForServer(baseURL);

  console.log("Running Passkey browser scenario...");
  await runBrowserScenario(baseURL);
  console.log("Passkey browser scenario passed.");
}

try {
  await main();
} catch (error) {
  if (page) {
    await page
      .screenshot({
        path: fileURLToPath(
          new URL("../.build/passkey-e2e-failure.png", import.meta.url),
        ),
        fullPage: true,
      })
      .catch(() => undefined);
  }

  console.error(error);

  if (serverLog) {
    console.error("\nNext.js output:\n", serverLog);
  }

  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => undefined);
  await stopServer().catch((error) => console.error(error));
  await dropTestDatabase().catch((error) => {
    console.error("Unable to remove the isolated test database:", error);
    process.exitCode = 1;
  });
}
