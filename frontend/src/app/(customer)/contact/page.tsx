import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import ContactForm from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact — Pokket Pizza",
  description:
    "Get in touch with Pokket Pizza — visit our shop, call us, or email pocketpizzawebsite@gmail.com.",
};

/**
 * Restaurant contact details. Hardcoded for the MVP; the contact form itself
 * is handled by the backend (see the contact-content issue).
 */
const contact = {
  address:
    "shop no.2, opp, Amba Mata Mandir- Raj Basera Society Rd, Sukhsagar Nagar, Hastinapuram, Pune, Maharashtra 411046",
  phone: "087881 97404",
  email: "pocketpizzawebsite@gmail.com",
  hours: "Open daily · 11:30–23:00",
};

const telHref = `tel:${contact.phone.replace(/[^0-9+]/g, "")}`;

/** Key-free Google Maps embed of the shop address plus its full-maps link. */
const mapEmbedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(contact.address)}&output=embed`;
const mapLinkHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`;

export default function ContactPage() {
  return (
    <div className="-mx-5 -mt-6 md:-mx-10">
      {/* Page hero */}
      <section className="relative h-[260px] overflow-hidden md:h-[340px]">
        <Image
          src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1600&q=80"
          alt="Wood-fired artisan pizza"
          fill
          loading="eager"
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />
        <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-center px-5 text-white md:px-10">
          <h1 className="font-heading text-h1-alt font-extrabold leading-[1.05] text-white md:text-display-l">
            Get in Touch
          </h1>
          <p className="mt-4 max-w-md text-body leading-relaxed text-white/85">
            Questions, catering, or a large order? We&apos;re happy to hear from you —
            we reply within a day.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-10 md:px-10 md:py-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Left column — quick actions, details and the message form */}
          <div className="space-y-8 lg:col-span-7">
            {/* Quick actions */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <a
                href={telHref}
                className="inline-flex items-center justify-center rounded-xl bg-brand-red px-6 py-3.5 font-heading text-button font-semibold text-white shadow-card transition-colors hover:bg-red-700"
              >
                Call Store Directly
              </a>
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center justify-center rounded-xl bg-blushTint px-6 py-3.5 font-heading text-button font-semibold text-brand-red shadow-card transition-colors hover:bg-brand-red hover:text-white"
              >
                Email Us
              </a>
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-border-default md:p-8">
                <h2 className="font-heading text-h4 font-extrabold text-charcoal">Visit Us</h2>
                <p className="mt-2 text-body text-bodySecondary">
                  <span className="font-semibold text-charcoal">Pokket Pizza</span> — our
                  neighbourhood shop.
                </p>
                <dl className="mt-4 text-body">
                  <div className="mt-3">
                    <dt className="font-heading text-label font-semibold uppercase text-mutedGray">
                      Address
                    </dt>
                    <dd className="mt-1 text-body text-bodySecondary">{contact.address}</dd>
                  </div>
                  <div className="mt-3">
                    <dt className="font-heading text-label font-semibold uppercase text-mutedGray">
                      Opening hours
                    </dt>
                    <dd className="mt-1 text-body text-bodySecondary">{contact.hours}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-border-default md:p-8">
                <h2 className="font-heading text-h4 font-extrabold text-charcoal">Reach Us</h2>
                <p className="mt-2 text-body text-bodySecondary">
                  Call us — we&apos;re usually at the oven between orders.
                </p>
                <dl className="mt-4 text-body">
                  <div className="mt-3">
                    <dt className="font-heading text-label font-semibold uppercase text-mutedGray">
                      Phone
                    </dt>
                    <dd className="mt-1">
                      <a
                        href={telHref}
                        className="font-heading font-semibold text-brand-red hover:underline"
                      >
                        {contact.phone}
                      </a>
                    </dd>
                  </div>
                  <div className="mt-3">
                    <dt className="font-heading text-label font-semibold uppercase text-mutedGray">
                      Email
                    </dt>
                    <dd className="mt-1">
                      <a
                        href={`mailto:${contact.email}`}
                        className="break-all font-heading font-semibold text-brand-red hover:underline"
                      >
                        {contact.email}
                      </a>
                    </dd>
                  </div>
                  <div className="mt-3">
                    <dt className="font-heading text-label font-semibold uppercase text-mutedGray">
                      Delivery
                    </dt>
                    <dd className="mt-1 text-body text-bodySecondary">
                      Free delivery under 1.5km.
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Contact form (email delivery is handled by the backend) */}
            <section
              aria-label="Send us a message"
              className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-border-default md:p-8"
            >
              <h2 className="font-heading text-h4 font-extrabold text-charcoal md:text-h3">
                Drop Us a Message
              </h2>
              <ContactForm />
            </section>
          </div>

          {/* Right column — sticky location map */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-border-default lg:sticky lg:top-24">
              <h2 className="font-heading text-h4 font-extrabold text-charcoal">Our Location</h2>
              <p className="mt-2 text-body text-bodySecondary">
                On Raj Basera Society Road, opposite Amba Mata Mandir — free delivery under
                1.5km.
              </p>
              <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-border-default">
                <iframe
                  src={mapEmbedSrc}
                  title="Map showing the Pokket Pizza shop"
                  className="h-[380px] w-full lg:h-[460px]"
                  loading="lazy"
                  allowFullScreen
                />
              </div>
              <a
                href={mapLinkHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center font-heading text-label font-semibold text-brand-red hover:underline"
              >
                Open in Google Maps →
              </a>
            </div>
          </div>
        </div>

        {/* Actions */}
        <section className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/menu"
            className="inline-flex w-full items-center justify-center rounded-full bg-brand-red px-6 py-3 font-heading text-button font-semibold text-white transition-colors hover:bg-red-700 sm:w-fit"
          >
            Order Now
          </Link>
          <Link
            href="/cart"
            className="inline-flex w-full items-center justify-center rounded-full bg-blushTint px-6 py-3 font-heading text-button font-semibold text-brand-red transition-colors hover:bg-brand-red hover:text-white sm:w-fit"
          >
            View Cart
          </Link>
        </section>
      </div>
    </div>
  );
}
