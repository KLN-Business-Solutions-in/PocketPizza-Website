# apps/admin

> **Admin panel** — internal order management and menu control for Pokket Pizza staff.
> Desktop-first (1446px), with a simplified mobile view for Order Management + Order Detail.

## Screens (from design spec)

| Screen | Desktop | Mobile |
|--------|---------|--------|
| Login | ✅ | — |
| Order Management | ✅ | ✅ |
| Order Detail | ✅ | ✅ |
| Menu Management | ✅ | — |
| Add / Edit Product | ✅ | — |
| Order History | ✅ | — |
| Reports | ✅ | — |

## Layout

```
┌─────────────────────────────────────────────┐
│  Admin Top Nav (~98px height, full width)   │
├───────────┬─────────────────────────────────┤
│ Sidebar   │  Main Panel                     │
│ (nav)     │  panel-header + panel-body      │
│           │  e.g. Kanban / tables / forms   │
│ sidebar-  │                                 │
│ footer    │                                 │
└───────────┴─────────────────────────────────┘
```

## Stack

- **HTML5** — semantic markup
- **Vanilla CSS** — design tokens from `shared/design-tokens/tokens.css`
- **Vanilla JS** — Kanban drag-and-drop, order status updates
