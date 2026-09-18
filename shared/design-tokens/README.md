# packages/design-tokens

> **Single source of truth** for all visual design tokens for the Pokket Pizza monorepo.
> Extracted directly from `docs/POKKET_PIZZA_DESIGN_SPEC.md` (Figma binary → 4,301 nodes).

## Usage

Import in any `apps/` stylesheet:

```css
@import '../../packages/design-tokens/tokens.css';
```

Or reference via relative path in HTML:

```html
<link rel="stylesheet" href="../../packages/design-tokens/tokens.css">
```

## Token Categories

| Category | Prefix | Example |
|----------|--------|---------|
| Brand | `--color-brand-*` | `--color-brand-red` |
| Text / Neutral | `--color-charcoal*`, `--color-body-*` | `--color-charcoal` |
| Backgrounds | `--color-cream-*`, `--color-*-tint` | `--color-cream-bg` |
| Semantic | `--color-success-*`, `--color-error-*` | `--color-success-bg` |
| Borders | `--color-border-*` | `--color-border-default` |
| Typography | `--font-*`, `--text-*`, `--fw-*`, `--lh-*` | `--font-heading` |
| Spacing | `--space-{n}` | `--space-4` (16px) |
| Radius | `--radius-{size}` | `--radius-md` (12px) |
| Shadow | `--shadow-*` | `--shadow-card` |
| Borders | `--border-*` | `--border-default` (1px) |
| Breakpoints | `--bp-*` | `--bp-desktop` (1440px) |

## Rules

- ❌ **Never** hardcode hex values in `apps/` — always use a token
- ❌ **Never** edit tokens here without updating `docs/POKKET_PIZZA_DESIGN_SPEC.md`
- ✅ Add new tokens in the correct category section
- ✅ Leave a comment with the source / frequency count from the Figma spec
