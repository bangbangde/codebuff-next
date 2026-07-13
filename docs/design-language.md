# Accepted Interface Language and Component Inventory

This document inventories the interface accepted at the end of M002. It is an
implementation reference for incremental UI-foundation work; it is not a new
design specification. The baseline is commit `909d5b8`, covering Landing, Lab,
Me, the root layout, global styles, both CSS Modules, and `BrandMark`.

The current output is the regression boundary. Follow-up work must preserve the
rendered hierarchy, responsive layouts, system light and dark themes, keyboard
focus, reduced-motion behavior, content, and information architecture unless a
separate approved work item explicitly changes them.

## Authority and scope

- Stable product and design direction remains in [`docs/project.md`](./project.md).
- The bilingual editorial division and Simplified Chinese UI punctuation
  convention remain authoritative in
  [`docs/project.md#editorial-conventions`](./project.md#editorial-conventions).
  [Issue #5](https://github.com/bangbangde/codebuff-next/issues/5) is the
  approval history for the bilingual decision. This inventory does not redefine
  either convention.
- [PR #12](https://github.com/bangbangde/codebuff-next/pull/12) is the accepted
  M002 implementation evidence.
- Issue #14 established this inventory. Issue #16 and its M003 Milestone define
  the current token-normalization boundary; no component, behavior, or product
  change is made here.

## Implementation map

| Area | Authoritative implementation | Current responsibility |
| --- | --- | --- |
| Shared document chrome | `app/layout.tsx`, `app/site-header.tsx`, `app/site-footer.tsx` | Root composition, skip link, site shell, sticky header, primary navigation, and footer implemented with Tailwind utilities |
| Brand mark | `app/brand-mark.tsx` | Decorative monoline SVG with Tailwind-owned presentation inside the accessible home link; foreground and warm-accent strokes inherit theme colors |
| Global theme and document rules | `app/globals.css` | Runtime color theme, Tailwind theme mappings, transitional page-body tokens, global focus, selection, and form inheritance |
| Landing | `app/page.tsx`, `app/page.module.css` | Reference editorial direction, Lab and Me discovery, interactive entry rows, fact summary, and page ending |
| Lab | `app/lab/page.tsx`, `app/content.ts`, `app/interior.module.css` | Editorial page header and numbered, anchorable article rows |
| Me | `app/me/page.tsx`, `app/interior.module.css` | Split editorial introduction, fact summary, and three-part practice composition |
| Stable product rules | `docs/project.md` | Editorial language, punctuation, visual direction, and page-ending guidance |

No JSX currently uses Tailwind utility classes. Tailwind v4 is imported;
semantic colors, font families, and the project-specific display typography are
registered with `@theme inline`, while the accepted surfaces continue to
consume CSS custom properties through global CSS and CSS Modules.

## Global token inventory

Global token ownership remains in `app/globals.css`: runtime theme values live
in `:root`, project-specific Tailwind theme values live in `@theme inline`, and
framework scale values come from Tailwind's imported defaults. “Tailwind alias
only” means no current rendered element uses the corresponding utility class.

### Color

| Token | Light / dark value | Actual consumers | Finding |
| --- | --- | --- | --- |
| `--background` | `#fdfcf9` / `#151310` | `html`, `body`, skip link, translucent site header, `--color-background` | Stable semantic theme token |
| `--surface-muted` | `#fff8eb` / `#2b241b` | Landing entry hover/focus, `--color-surface-muted` | Stable interactive surface token |
| `--foreground` | `#181512` / `#f7f3ed` | Body text, skip link, BrandMark, selection text, `--color-foreground` | Stable semantic theme token |
| `--muted-foreground` | `#706961` / `#bdb4aa` | Header links, footer, supporting copy, labels, facts, entry metadata, `--color-muted-foreground` | Stable secondary-text token used on all surfaces |
| `--accent` | `#b85d16` / `#ffad57` | Brand accent, hover/focus text, focus outline, labels, end mark, `--color-accent` | Stable brand/action token used on all surfaces |
| `--accent-soft` | `#fff0cc` / `#3c2917` | Header and Landing-link hover/focus backgrounds, selection background, `--color-accent-soft` | Stable low-emphasis interaction token |
| `--border` | `#ebe6df` / `#3c352e` | Header, sections, rows, fact lists, end mark, `--color-border` | Stable structural-rule token used on all surfaces |

Dark mode changes only these semantic color values. Components do not contain
theme-specific color literals, which is a boundary to preserve. The unused
`surface` role was retired by the Issue #16 normalization.

### Typography

| Token | Value | Actual consumers | Finding |
| --- | --- | --- | --- |
| `--typeface-body` | System sans stack with Simplified Chinese fallbacks | `body`, `--font-sans` | Stable shared font family |
| `--typeface-code` | System monospace stack | Header links, footer, skip link, editorial labels, fact terms, `--font-mono` | Stable metadata/label font family |
| Tailwind `--text-xs` | `0.75rem` | Footer, editorial metadata, fact terms, end label | Tailwind v4 default is the shared size authority |
| Tailwind `--text-sm` | `0.875rem` | Skip link, header links, Landing section links | Tailwind v4 default is the shared control-size authority |
| Tailwind `--text-base` | `1rem` | Body and Landing end note | Tailwind v4 default is the body-size authority |
| Tailwind `--text-lg` | `1.125rem` | Landing supporting copy and title arrow, interior introductions | Tailwind v4 default is the lead-size authority |
| `--text-display` | `clamp(2.25rem, 6vw, 4.75rem)` | Lab and Me `h1` | Intentional project value registered in `@theme inline` |
| `--leading-display` | `1.05` | Lab and Me `h1` | Intentional project value registered without overriding Tailwind's `leading-tight` |
| `--leading-body` | `1.65` | `body` | Intentional project reading leading registered in `@theme inline` |
| `--tracking-label` | `0.08em` | Kicker, indexes, metadata, fact terms, interior eyebrows, end label | Intentional editorial-label tracking registered in `@theme inline` |

Issue #16 removed the duplicate local text declarations and renamed the custom
display leading. Tailwind's installed text scale and `leading-tight` now retain
their framework meanings; project-specific roles are explicit theme entries.

The large Landing hero, section headings, item headings, principle headings,
and endcap heading use distinct fluid sizes, weights, tracking, and leading.
Those values encode composition-specific hierarchy and should remain local
until another surface demonstrates the same role.

### Spacing

| Token | Value | Representative consumers | Finding |
| --- | --- | --- | --- |
| `--space-1` | `0.25rem` | Header-nav gap, Landing arrow movement | Stable scale step; equals Tailwind spacing step `1` |
| `--space-2` | `0.5rem` | Skip link, header links, Landing links and mobile grids, Me detail offset | Stable scale step; equals Tailwind spacing step `2` |
| `--space-3` | `0.75rem` | Skip link, section headings/links, entry hover inset, mobile item gap | Stable scale step; equals Tailwind spacing step `3` |
| `--space-4` | `1rem` | Footer, fact rows, headings, descriptions, mobile layouts | Stable scale step; equals Tailwind spacing step `4` |
| `--space-6` | `1.5rem` | Header, hero/title spacing, rows, grids, principle cards | Stable scale step; equals Tailwind spacing step `6` |
| `--space-8` | `2rem` | Footer, section bodies, row padding, responsive stacks, end mark | Stable scale step; equals Tailwind spacing step `8` |
| `--space-12` | `3rem` | Entry list, fact list, interior page padding, responsive principle grid | Stable scale step; equals Tailwind spacing step `12` |
| `--space-16` | `4rem` | Major section padding, page headers, endcap, principle grid | Stable scale step; equals Tailwind spacing step `16` |

Every spacing alias is consumed, but every value is already an exact multiple of
Tailwind v4's installed `--spacing: 0.25rem` scale. They are transitional
duplication, not a second project spacing system.

### Shape, border, and layout

| Token | Value | Actual consumers | Finding |
| --- | --- | --- | --- |
| Tailwind `--radius-md` | `0.375rem` | Header navigation and Landing section links | Tailwind v4 default now owns the accepted control radius |
| `--border-width` | `1px` | Page-body structural rules | Transitional page-body token; global chrome uses Tailwind's default border width |
| `--layout-max` | `72rem` | Root, header, and footer max-width utilities | Stable site-shell maximum consumed through Tailwind arbitrary-value utilities; equals the installed `6xl` width |
| `--layout-reading` | `44rem` | Landing hero explanatory copy | Stable reading measure; keep semantic because it is not a default container step |
| `--layout-gutter` | `clamp(1.25rem, 4vw, 3rem)` | Root, header, footer, and skip-link utilities | Stable fluid page gutter consumed by Tailwind arbitrary-value utilities |

## Responsive, focus, theme, and motion boundaries

- `40rem` is the shared narrow-layout boundary. It collapses the footer, Landing
  entry/about layouts, Lab rows, and Me split/principle layouts. It matches the
  installed Tailwind `sm` breakpoint value, but current CSS uses a max-width
  query and must retain the same side of the boundary during migration.
- `64rem` is Landing's wide hero boundary. It matches the installed Tailwind
  `lg` breakpoint and keeps the hero statement on one line.
- The site shell uses a fluid gutter and a `72rem` content maximum. Interior and
  Landing compositions deliberately use their own grid proportions inside it.
- All keyboard-visible focus uses the global `2px` accent outline with a `3px`
  offset. Hover and focus share feedback on navigation, section links, and
  Landing entry rows. The skip link becomes visible on focus.
- Header navigation and Landing section links provide at least `2.75rem` (44px)
  target height. The brand link also has a 44px minimum height.
- System dark mode is token-driven through `prefers-color-scheme: dark`; there
  is no theme toggle or component-level dark branch.
- Motion is limited to 140ms control/brand transitions and 160ms Landing-row
  transitions. `prefers-reduced-motion: reduce` disables every declared
  transition. The 140ms/160ms difference is minor duplication, but consolidating
  it would be an intentional behavior choice and should not be hidden inside a
  mechanical migration.
- Sticky-header offset behavior is split between `html` scroll padding and Lab
  item scroll margin. Anchor migration must verify `/lab#…` destinations rather
  than treating these as arbitrary spacing.

## Pattern classification

### Stable shared semantics

| Pattern | Evidence and consumers | Proposed ownership | Exclusions and regression checks |
| --- | --- | --- | --- |
| Semantic color theme | Every surface consumes the same background, foreground, muted, accent, soft-accent, and border roles | CSS variables for light/dark values; Tailwind `--color-*` inline aliases | Do not place palette literals in components; verify all surfaces in both system themes |
| Body and metadata typography | Body stack is global; monospaced labels appear in header, footer, Landing, Lab, and Me | Tailwind font, text, leading, and tracking theme namespaces; CSS Modules may consume the same variables during migration | Do not turn distinct fluid display hierarchies into one generic heading scale |
| Structural rules | Header, sections, lists, facts, cards, and endcap consistently use a one-pixel semantic border | Semantic border color plus Tailwind's default border width | Preserve exactly which edges are drawn; a generic bordered container is not supported by evidence |
| Editorial label | Landing kicker/index, Lab/Me eyebrow, list metadata, fact terms, principle index, and end label share mono type, compact size, and tracking | Shared token recipe first; a focused `SectionLabel` component only for repeated paragraph-style section labels | `dt`, entry metadata, and numerical indexes have different semantics and should not be forced through one React component |
| Fact list | Landing and Me repeat `dl > div > dt + dd`, border rules, mono terms, and responsive columns | Focused `FactList` component is a credible later candidate, with layout width retained by the owning surface | Do not add generic definition-list variants; verify Landing's 5rem term column and Me's current 8rem-to-5rem behavior |
| Global chrome | Header, navigation, shell, skip link, and footer are shared by the root layout | Focused `SiteHeader` and `SiteFooter` components own their Tailwind utilities; `layout.tsx` owns composition | They remain single global instances; the boundary expresses semantic ownership rather than a generic component system |
| BrandMark | Existing focused React component, consumed by the global home link | React owns the SVG and its Tailwind presentation | Preserve decorative SVG semantics, accessible link label, dimensions, stroke widths, currentColor behavior, and accent nodes |
| Interaction feedback | Header links, Landing section links, and Landing entry rows share accent/soft-accent hover and focus feedback | Shared color/focus/motion tokens; keep composition selectors local | These controls have different semantics and layouts; do not create a generic `Link` wrapper solely to share classes |

### Surface-specific composition to retain locally

- Landing's oversized single-line wide hero, two discovery sections, interactive
  entry grid, about split, and centered endcap form its reference composition.
- Lab's article rows are non-clickable, anchorable content records. They should
  not share a component with Landing's interactive entry links even though both
  use numbered metadata and structural rules.
- Me's split hero and three-column practice sequence express Me-specific content
  relationships. Their responsive collapse belongs in the interior CSS Module.
- Lab and Me share `interior.module.css` because their proven page-header and
  reading rhythms overlap. Their JSX differs enough that a generic page-template
  component would add props without removing meaningful duplication.
- Fluid heading sizes, grid fractions, reading measures, end-mark geometry, and
  wide/narrow composition adjustments remain local to their surfaces. Migrate
  them in focused slices; retain minimal local CSS only when an equivalent
  utility expression would materially reduce readability.

### Incidental duplication not to abstract

- Similar `font-weight` values (`520` and `540`) belong to different local
  heading roles; do not invent a broad project weight taxonomy yet.
- The 140ms and 160ms transitions are close but currently express controls
  versus expanding/translated rows. Do not merge them without review.
- Repeated grid fractions around `0.3fr` describe different content structures,
  not a shared layout primitive.
- Landing and interior reading widths (`36rem`, `38rem`, `40rem`, and `44rem`)
  are context-specific measures, not evidence for several global container
  tokens.
- The unused `surface`, project radius, and shadow declarations were retired in
  Issue #16. Their former presence is not evidence for cards, panels, or
  elevation.

## Current token ownership and proposed component split

### CSS variables

Keep CSS variables as the runtime authority for semantic values that change with
system theme (`background`, foreground roles, accents, and border) and for fluid
layout values consumed through Tailwind arbitrary-value utilities or retained CSS
Modules (`layout-gutter` and reading measure).
Global CSS continues to own reset, selection, focus outline, and the runtime
theme media query. Tailwind utilities colocated with `SiteHeader`, `SiteFooter`,
`BrandMark`, and `layout.tsx` own body defaults, skip-link behavior, the site
shell, and global chrome.

### Tailwind v4 `@theme`

Tailwind registration is explicit rather than relying on `:root` names that
overlap framework namespaces:

| Accepted role | Current Tailwind ownership | Rationale |
| --- | --- | --- |
| Semantic colors | Inline `--color-background`, `surface-muted`, `foreground`, `muted-foreground`, `accent`, `accent-soft`, and `border`; `surface` remains omitted until used | Produces utilities while preserving runtime light/dark variables |
| Font families | Inline `--font-sans` and `--font-mono` mappings | Shared across global CSS and future utilities |
| `xs`, `sm`, `base`, `lg` text | Installed Tailwind values | Accepted values are exact matches |
| Interior display text | Custom `--text-display` theme value | Creates an intentional `text-display` utility and remains consumable from CSS Modules |
| Display/body leading | Custom `--leading-display` and `--leading-body` values | Preserves Tailwind's built-in `leading-tight` semantics |
| Editorial tracking | Custom `--tracking-label` value | Demonstrated on all three surfaces |
| Spacing | Use Tailwind's installed `0.25rem` base scale; retire `--space-*` aliases incrementally as each consumer moves | Every current spacing alias exactly matches that scale |
| Control radius | Use the installed `--radius-md` value (`0.375rem`) | Matches accepted output without overriding Tailwind's `radius-sm` name |
| Site and reading widths | Register semantic container names only if a utility consumer is introduced; otherwise keep layout variables | Avoids theme entries with no utility consumer |
| Motion | Keep exact values local initially; introduce named duration/easing theme values only after the 140ms/160ms choice is reviewed | Prevents an incidental visual-behavior change |

### Focused React components

Retain `BrandMark`. `SiteHeader` and `SiteFooter` are focused ownership
boundaries introduced with the global-chrome Tailwind migration; they are not a
generic component system. The next evidence-backed shared extraction candidate
is `FactList`, because Landing and Me repeat the same semantic markup and content
roles. `SectionLabel` is a secondary candidate limited to paragraph-style
section labels. Entry rows, page endings, and generic link or layout primitives
are not justified as shared React components by the current implementation.

### Retained CSS Modules

Keep Landing composition in `page.module.css` and Lab/Me composition in
`interior.module.css` until their focused migration slices. During each slice,
move ordinary layout, typography, responsive, and interaction rules into
Tailwind utilities. Retain only the minimal surface-local CSS whose utility form
would reduce clarity.

## Recommended implementation sequence

1. **Issue #16: normalize token ownership and Tailwind mappings.** This completed
   the namespace cleanup and registered the accepted custom theme roles.
2. **Issue #18: migrate global chrome.** Move the shell, skip link, header,
   navigation, footer, and BrandMark presentation into focused components with
   Tailwind utilities while preserving exact interaction and responsive output.
3. **Issue #19: migrate Landing.** Move ordinary Landing styles into Tailwind,
   retaining minimal local CSS only where its composition is clearer that way.
4. **Issue #20: migrate Lab and Me and finish shared semantics.** Complete the
   page migration, extract `FactList`, evaluate `SectionLabel`, and consolidate
   the regression evidence required for M003 review.

The sequence keeps each migration independently reviewable. M003 closure still
requires an owner-led live review after the implementation Issues are accepted.

## Regression evidence required for follow-up work

- `npm run lint` and `npm run build` pass.
- Landing, Lab, and Me match the accepted output at a representative narrow
  width below `40rem` and desktop width at or above `64rem`.
- System light and dark modes retain contrast, warm accents, translucent header,
  structural rules, selection, and BrandMark colors.
- Keyboard review covers skip link, brand home link, primary navigation,
  Landing section links, entry links, and `/lab#…` destinations.
- Reduced-motion mode removes all transitions without removing state feedback.
- The bilingual content, `lang="zh-CN"` annotations, short-copy punctuation,
  metadata, navigation, and information architecture remain unchanged.
