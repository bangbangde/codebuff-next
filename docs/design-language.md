# Interface Design Language

## Purpose

This document guides the visual and interaction design of `CQ’s Lab`. It turns
the stable experience direction in [`docs/project.md`](./project.md) into
practical UI rules without prescribing the composition of a particular page.

Use it when designing or reviewing a new surface, extending an existing
pattern, or deciding whether a visual choice belongs in the shared language.
Current product scope belongs in GitHub Issues and Milestones. Routes, feature
behavior, component inventories, and implementation defects do not belong here.

## Experience qualities

The interface should feel:

- **Technical:** structure and precision are visible, but the site does not look
  like a developer tool dashboard.
- **Human:** language and rhythm feel authored rather than generated from a
  generic template.
- **Calm:** hierarchy is clear without oversized claims, excessive whitespace,
  or constant motion.
- **Credible:** typography, alignment, states, and content details are handled
  consistently.
- **In progress:** the site may show active exploration, but placeholders and
  unfinished work should be honest and deliberate.

The overall character is editorial rather than promotional. Avoid portfolio
theater, generic SaaS composition, ornamental complexity, and interaction added
only to demonstrate implementation skill.

## Core principles

### Lead with content

Keep introductions compact and let substantive content appear early. Visual
hierarchy should help readers understand the material rather than compete with
it.

### Create hierarchy with restraint

Use typography, spacing, alignment, and fine structural rules before adding
containers, shadows, illustrations, or decorative effects. A small number of
strong relationships is preferable to many weak visual signals.

### Use warmth as emphasis

Warm orange is an accent, not a background theme or a substitute for
hierarchy. Most of the interface should remain neutral so links, focus,
metadata, and important status can carry the accent clearly.

### Prefer coherence over uniformity

Surfaces should share tokens and interaction behavior without being forced into
one page template. Extract a visual pattern only after repeated use or a clear
shared semantic need.

### Keep every interaction purposeful

Hover, focus, transition, and animation should communicate state or navigation.
The experience must remain understandable with motion reduced or absent.

## Color

The palette uses semantic roles. Components should consume the role rather than
copying its literal value.

| Role | Light | Dark | Usage |
| --- | --- | --- | --- |
| Background | `white` | `#151310` | Primary document and control background |
| Muted surface | `#fff8eb` | `#2b241b` | Secondary panels, notices, quotes, and quiet separation |
| Foreground | `#181512` | `#f7f3ed` | Primary text and strong controls |
| Muted foreground | `#706961` | `#bdb4aa` | Supporting copy, navigation, labels, and metadata |
| Accent | `#b85d16` | `#ffad57` | Links, focus, labels, status, and selective emphasis |
| Soft accent | `#fff0cc` | `#3c2917` | Selection, low-emphasis feedback, and inline highlights |
| Border | `#ebe6df` | `#3c352e` | Structural rules, fields, and panel boundaries |

### Color rules

- Preserve readable contrast in both system themes.
- Use foreground for primary actions and accent for their interactive state
  when a stronger filled control is needed.
- Use muted foreground only for genuinely secondary information.
- Prefer a one-pixel border to a shadow for grouping and structure.
- Do not introduce isolated palette literals when an existing semantic role
  expresses the intent.
- The brand mark owns its fixed black and orange artwork. Do not derive general
  interface colors from the asset.

Dark mode follows the system `prefers-color-scheme` setting. There is currently
no product requirement for a manual theme control. Theme differences should be
expressed through semantic roles rather than per-component dark branches.

## Typography

Typography carries most of the interface character.

### Families

- **Body:** system sans-serif with Simplified Chinese fallbacks. Use for
  headings, prose, and interface copy.
- **Monospace:** system monospace. Reserve for navigation, editorial labels,
  metadata, indexes, and compact controls.

Monospace is a supporting editorial voice, not the default for all technical
content.

### Hierarchy

- Display headings may use the shared fluid size
  `clamp(2.25rem, 6vw, 4.75rem)` with `1.05` leading.
- Body copy uses comfortable `1.65` leading by default. Long-form article prose
  may open further, especially on wider screens.
- Editorial labels use compact type, monospace, uppercase when appropriate, and
  approximately `0.08em` tracking.
- Use tighter tracking as headings grow. Avoid loose tracking on large display
  text.
- Use fluid display sizes only for genuine page-level hierarchy. Ordinary
  section and card headings should remain quieter.

Do not turn every heading into the same generic scale. Local composition may
need different size, weight, measure, or leading, but those choices should
remain visibly related to the shared type system.

## Layout and spacing

### Shared measures

| Role | Value | Guidance |
| --- | --- | --- |
| Site maximum | `72rem` | Maximum width for the shared shell and broad editorial layouts |
| Reading measure | `44rem` | Upper bound for sustained article prose |
| Page gutter | `clamp(1.25rem, 4vw, 3rem)` | Fluid horizontal breathing room from narrow to wide screens |

### Composition

- Favor editorial grids, asymmetric splits, and clear reading measures over
  uniform card matrices.
- Keep text columns narrow enough to read comfortably even when the surrounding
  composition is wide.
- Use spacing to express relationships: tight inside a group, larger between
  sections, and deliberate at page endings.
- Fixed spacing and standard radii should come from the existing Tailwind
  scale. Use custom fluid values only when they express responsive
  composition—not to create a parallel spacing system.
- Preserve useful information density. Calm does not mean empty.

### Shape and separation

- Structural borders are the default separator.
- Medium radii are appropriate for controls and small interaction surfaces;
  larger panels may use a slightly larger radius.
- Avoid turning editorial content into a collection of rounded cards.
- Use shadows sparingly and only when depth communicates behavior.
- Page endings should feel intentional. Add a next step only when it serves a
  clear navigation purpose.

## Responsive behavior

Design from narrow and wide conditions together.

- `40rem` is the principal narrow-layout boundary in the current language.
- Additional content-driven breakpoints are allowed when a control or column
  has a real minimum width; they should not be introduced merely to tune one
  screenshot.
- Multi-column editorial layouts should collapse to a clear single reading
  order.
- Maintain the fluid page gutter and prevent horizontal overflow at `375px`.
- Do not preserve desktop line breaks when they create awkward narrow-screen
  rhythm.
- Touch targets remain at least `44px`; primary form controls should generally
  reach `48px`.

Responsive review must cover content hierarchy and reading order, not only the
absence of overflow.

## Interaction states

Every interactive element needs an identifiable default, hover, and
keyboard-focus state. Add active, selected, disabled, loading, success, and
error states when the interaction semantics require them.

### Focus

- The shared keyboard-focus treatment is a `2px` accent outline with a `3px`
  offset.
- Form fields may replace the outer outline with an accent border and
  soft-accent ring when this gives clearer field-level feedback.
- Never remove an outline without supplying an equally visible replacement.
- Focus feedback must remain distinguishable from hover.

### Hover and active feedback

- Text and navigation actions may shift from muted foreground to accent.
- Soft accent is suitable for low-emphasis hover or focus backgrounds.
- Filled primary actions may change from foreground to accent.
- Avoid layout shifts, large translations, or decorative reveals for routine
  controls.

### Motion

- Most transitions should remain in the `140–150ms` range.
- Animate only properties that communicate a state change.
- Repeating animation is reserved for meaningful live status and should remain
  visually quiet.
- Every declared transition or animation must have an effective
  `prefers-reduced-motion` alternative.

## Content and language

- `CQ’s Lab`, product-surface names, compact labels, and short positioning
  phrases may remain in English.
- Simplified Chinese carries most explanation and long-form interface copy.
- Chinese-English mixing should sound natural, not perform technical identity.
- Use concise, direct language. Avoid inflated claims and explanations that are
  more elaborate than the underlying work.
- Apply the correct `lang` attribute when a meaningful text region differs from
  the document language.
- Keep punctuation appropriate to the language of the phrase.

## Recurring UI patterns

These patterns describe visual and semantic behavior, not required React
components.

### Global chrome

Keep branding and primary navigation compact. The header may remain visible
during reading, but it should not dominate the viewport. The footer should give
the page a clear ending without becoming another content section.

### Editorial introduction

Use one clear title, a restrained label or status when useful, and concise
supporting copy. Avoid stacking several slogans, badges, or calls to action
before the main content.

### Labels and metadata

Use monospace, compact sizing, restrained tracking, and muted or accent color.
Metadata should help scanning without competing with titles.

### Long-form content

Use a stable reading measure, generous line height, strong section hierarchy,
and deliberate spacing around lists, quotations, code, and rules. Code blocks
may use an inverse neutral surface; inline code uses the soft accent role.

### Forms and account-like controls

Group related controls in a quiet muted surface with a clear border. Labels,
instructions, status messages, disabled states, and destructive consequences
must remain explicit. Do not rely on placeholder text as the only label.

## Avoid

- Generic SaaS hero-and-card compositions.
- Uniform grids when the content has a stronger editorial hierarchy.
- Oversized promotional statements without substantive content nearby.
- Decorative illustration or motion without a content purpose.
- New colors, spacing aliases, or component variants introduced for one local
  convenience.
- Low-contrast muted text used for important instructions.
- Hover-only affordances or invisible keyboard focus.
- Abstractions that erase meaningful differences between surfaces.

## UI review checklist

For a meaningful interface change, verify:

- The result still feels technical, human, calm, credible, and editorial.
- Content appears early and hierarchy is understandable without decoration.
- Semantic color roles work in system light and dark themes.
- Typography, reading measure, and spacing support the content.
- Desktop and `375px` layouts have a deliberate reading order and no horizontal
  overflow.
- Keyboard focus is visible and all controls are reachable.
- Touch targets meet the minimum size.
- Hover, disabled, loading, success, and error states are present where needed.
- Reduced-motion mode removes nonessential movement without removing state
  feedback.
- Chinese and English copy use appropriate language annotations and
  punctuation.
- New shared tokens or patterns are supported by repeated or semantic need.

Code-level verification remains:

```bash
pnpm lint
pnpm build
git diff --check
```
