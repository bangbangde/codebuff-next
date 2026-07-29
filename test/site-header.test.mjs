import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("Site header navigation", () => {
  it("keeps the Site header static while composing a utility-link island", async () => {
    const header = await readFile(
      "app/(site)/_components/site-header.tsx",
      "utf8",
    );

    assert.match(header, /href="\/me"/);
    assert.match(header, /<SiteUtilityLinks \/>/);
    assert.doesNotMatch(
      header,
      /getCurrentSession|requireCurrentSession|requireAdmin|authClient/,
    );
  });

  it("provides accessible GitHub and Admin icon links", async () => {
    const utilities = await readFile(
      "app/(site)/_components/site-utility-links.tsx",
      "utf8",
    );

    assert.match(utilities, /function GitHubMarkIcon/);
    assert.match(utilities, /fill="currentColor"/);
    assert.match(utilities, /LayoutDashboardIcon/);
    assert.match(
      utilities,
      /href="https:\/\/github\.com\/bangbangde\/codebuff-next"/,
    );
    assert.match(utilities, /target="_blank"/);
    assert.match(utilities, /rel="noopener noreferrer"/);
    assert.match(utilities, /href="\/admin"/);
    assert.match(utilities, /aria-label="GitHub"/);
    assert.match(utilities, /aria-label="Admin"/);
    assert.match(utilities, /title="GitHub"/);
    assert.match(utilities, /title="Admin"/);
    assert.match(utilities, /inline-flex size-11/);
    assert.match(utilities, /hover:bg-brand-accent-soft/);
    assert.match(utilities, /focus-visible:text-brand-accent/);
    assert.match(utilities, /<TooltipContent side="bottom" sideOffset=\{6\}>/);
  });
});
