# apps/customer

> **Customer-facing website** — browse-to-order flow for Pokket Pizza.
> Mobile-first, responsive (375px → 1440px). No login required.

## Screens (from design spec)

| Screen | Mobile | Desktop |
|--------|--------|---------|
| Home | ✅ | ✅ |
| About | ✅ | ✅ |
| Menu | ✅ | ✅ |
| Cart | ✅ | ✅ |
| Checkout | ✅ | ✅ |
| Contact | ✅ | ✅ |
| Product Customization | ✅ | ✅ |
| Checkout Order Types | ✅ | ✅ |
| Order Confirmation | ✅ | ✅ |
| Order Tracking | ✅ | ✅ |
| Invoice | ✅ | ✅ |
| Supporting States | ✅ | ✅ |

## Order Flow

```
Browse Menu → Add to Cart → Review Cart → Checkout → WhatsApp Order Sent → Pay on Delivery/Pickup
```

## Stack

- **HTML5** — semantic, accessible markup
- **Vanilla CSS** — design tokens from `shared/design-tokens/tokens.css`
- **Vanilla JS** — cart logic, LocalStorage, WhatsApp deeplink
