import Link from "next/link";
import {
  mailtoHref,
  siteContact,
  telHref,
} from "@/lib/contact";

/**
 * Site footer — rendered once by the customer layout, so every
 * customer-facing page (Home, About, Menu, Cart, …) gets it.
 * Static, server-rendered; navigation only, no client interactivity.
 */
export default function Footer() {
  const year = new Date().getFullYear();

  const exploreLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/menu", label: "Menu" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <footer className="mt-auto bg-charcoal text-white">
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-10 md:py-14">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <Link
              href="/"
              className="flex items-center gap-2 font-heading text-lg font-extrabold tracking-tight"
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-md bg-brand-red text-sm text-white"
                aria-hidden="true"
              >
                🍕
              </span>
              <span className="text-white">
                POKKET <span className="text-brand-red">PIZZA</span>
              </span>
            </Link>
            <p className="mt-4 text-body leading-relaxed text-white/85">
              Handmade pizzas, delivered fast — baked fresh in our wood-fired deck
              oven.
            </p>
          </div>

          {/* Explore */}
          <nav aria-label="Footer">
            <h2 className="font-heading text-label font-bold uppercase tracking-wide text-white/70">
              Explore
            </h2>
            <ul className="mt-4 space-y-2">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-body text-white/85 transition-colors hover:text-brand-red hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h2 className="font-heading text-label font-bold uppercase tracking-wide text-white/70">
              Contact
            </h2>
            <address className="not-italic">
              <p className="text-body leading-relaxed text-white/85">{siteContact.address}</p>
              <p className="mt-2">
                <a
                  href={telHref(siteContact.phone)}
                  className="font-heading font-semibold text-brand-red hover:underline"
                >
                  {siteContact.phone}
                </a>
              </p>
              <p>
                <a
                  href={mailtoHref(siteContact.email)}
                  className="break-all font-heading font-semibold text-brand-red hover:underline"
                >
                  {siteContact.email}
                </a>
              </p>
              <p className="text-caption text-white/70">{siteContact.hours}</p>
            </address>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/15 pt-6 text-caption text-white/70 sm:flex-row sm:justify-between">
          <p>© {year} Pokket Pizza. All rights reserved.</p>
          <p>Baked fresh every day · Open daily 11:30–23:00</p>
        </div>
      </div>
    </footer>
  );
}
