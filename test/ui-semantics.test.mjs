import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const semanticRoles = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "brand-accent",
  "brand-accent-soft",
];

function getRuleBlock(css, selectorEnd) {
  const selectorIndex = css.indexOf(selectorEnd);
  assert.notEqual(selectorIndex, -1, `Missing CSS selector: ${selectorEnd}`);

  const openingBrace = css.indexOf("{", selectorIndex);
  const closingBrace = css.indexOf("}", openingBrace);

  return css.slice(openingBrace + 1, closingBrace);
}

function getRoleValue(block, role) {
  return block.match(new RegExp(`--${role}:\\s*([^;]+);`))?.[1];
}

describe("shared UI semantics", () => {
  it("pins the approved shadcn generation baseline", async () => {
    const config = JSON.parse(await readFile("components.json", "utf8"));

    assert.equal(config.style, "base-nova");
    assert.equal(config.rsc, true);
    assert.equal(config.tsx, true);
    assert.equal(config.tailwind.baseColor, "stone");
    assert.equal(config.tailwind.cssVariables, true);
  });

  it("binds the complete semantic contract for every product surface", async () => {
    const css = await readFile("app/globals.css", "utf8");
    const blocks = [
      getRuleBlock(css, ".surface-site {"),
      getRuleBlock(css, ".surface-site.dark {"),
      getRuleBlock(css, ".surface-admin {"),
      getRuleBlock(css, ".surface-admin.dark {"),
    ];

    for (const block of blocks) {
      for (const role of semanticRoles) {
        assert.match(block, new RegExp(`--${role}:`));
      }
    }
  });

  it("gives Admin a GitHub-inspired tool palette without leaking into Site", async () => {
    const css = await readFile("app/globals.css", "utf8");
    const siteLight = getRuleBlock(css, ".surface-site {");
    const siteDark = getRuleBlock(css, ".surface-site.dark {");
    const adminLight = getRuleBlock(css, ".surface-admin {");
    const adminDark = getRuleBlock(css, ".surface-admin.dark {");

    assert.deepEqual(
      {
        background: getRoleValue(adminLight, "background"),
        card: getRoleValue(adminLight, "card"),
        muted: getRoleValue(adminLight, "muted"),
        accent: getRoleValue(adminLight, "accent"),
        border: getRoleValue(adminLight, "border"),
        brandAccent: getRoleValue(adminLight, "brand-accent"),
      },
      {
        background: "#ffffff",
        card: "#ffffff",
        muted: "#f6f8fa",
        accent: "#e6eaef",
        border: "#d1d9e0",
        brandAccent: "#0969da",
      },
    );
    assert.deepEqual(
      {
        background: getRoleValue(adminDark, "background"),
        card: getRoleValue(adminDark, "card"),
        muted: getRoleValue(adminDark, "muted"),
        accent: getRoleValue(adminDark, "accent"),
        border: getRoleValue(adminDark, "border"),
        brandAccent: getRoleValue(adminDark, "brand-accent"),
      },
      {
        background: "#0d1117",
        card: "#161b22",
        muted: "#161b22",
        accent: "#21262d",
        border: "#30363d",
        brandAccent: "#58a6ff",
      },
    );
    assert.equal(getRoleValue(siteLight, "background"), "#ffffff");
    assert.equal(getRoleValue(siteLight, "brand-accent"), "#b85d16");
    assert.equal(getRoleValue(siteDark, "background"), "#151310");
    assert.equal(getRoleValue(siteDark, "brand-accent"), "#ffad57");
  });

  it("propagates the active surface through portal-based UI", async () => {
    const dialog = await readFile("components/ui/dialog.tsx", "utf8");
    const sonner = await readFile("components/ui/sonner.tsx", "utf8");
    const surfaceTheme = await readFile("components/surface-theme.tsx", "utf8");

    assert.match(dialog, /useSurfaceClassName/);
    assert.match(dialog, /DialogPrimitive\.Portal/);
    assert.match(
      dialog,
      /className=\{cn\(surfaceClassName, className\)\}/,
    );
    assert.match(surfaceTheme, /surface-\$\{surface\}/);
    assert.match(
      surfaceTheme,
      /<Toaster className=\{cn\("toaster group", surfaceClassName\)\} \/>/,
    );
    assert.match(sonner, /description: "text-muted-foreground!"/);
  });
});
