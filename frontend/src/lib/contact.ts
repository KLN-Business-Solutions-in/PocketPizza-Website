/**
 * Hardcoded restaurant contact details.
 *
 * The customer-facing marketing pages (Home, About, Contact) render this
 * static copy for the MVP — there is no CMS wired up to it yet. The
 * backend contact-content issue replaces these values once it lands.
 */

export const siteContact = {
  address:
    "shop no.2, opp, Amba Mata Mandir- Raj Basera Society Rd, Sukhsagar Nagar, Hastinapuram, Pune, Maharashtra 411046",
  phone: "087881 97404",
  email: "pocketpizzawebsite@gmail.com",
  hours: "Open daily · 11:30–23:00",
};

/** tel: URIs carry digits only — keep the display copy human readable. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, "")}`;
}

export function mailtoHref(email: string): string {
  return `mailto:${email}`;
}
