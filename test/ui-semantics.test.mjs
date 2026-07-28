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
