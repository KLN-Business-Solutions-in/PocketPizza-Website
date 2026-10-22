import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us — Pokket Pizza",
  description:
    "The story behind Pokket Pizza — our slow-proofed sourdough, farm-fresh sourcing, and the craft behind every bake.",
};

/**
 * Contact details shown on this page. The dedicated Contact route
 * (/contact) carries the full block, including the map.
 */
const contact = {
  address:
    "shop no.2, opp, Amba Mata Mandir- Raj Basera Society Rd, Sukhsagar Nagar, Hastinapuram, Pune, Maharashtra 411046",
  phone: "087881 97404",
  email: "pocketpizzawebsite@gmail.com",
};

const storyParagraphs = [
  "Founded with a simple dream to bring affordable, high-quality, and delicious Italian-style pizzas to the neighborhood, Pokket Pizza has grown from a humble local spot into a community favorite. We believe in keeping things fresh, friendly, and flavor-packed.",
];

const foundersQuote =
  "We wanted to build a pizza brand that feels like a cozy artisanal neighborhood joint but operates with modern delivery speed. No compromises, just incredible crusts.";

const doughParagraphs = [
  "What sets us apart from the rest? Our signature, freshly handmade pizza dough.",
  "Every single day, our kitchen starts from scratch. We don't believe in frozen shortcuts or pre-made crusts.",
  "Our dough is mixed, kneaded, and proofed daily using traditional techniques, resulting in a crust that is perfectly light, airy on the inside, and delightfully crisp on the outside.",
  "It's the loving foundation of every pizza we serve.",
];

const sourcingParagraphs = [
  "Farm-Fresh Produce — We partner with trusted local suppliers to bring in crisp vegetables and vibrant ingredients daily.",
  "Quality Cheese & Sauce — Our signature sauces are slow-simmered using ripe, flavorful tomatoes and herbs, paired with premium, melt-in-your-mouth cheese that brings every slice together.",
];

const kitchenParagraphs = [
  "Made Fresh to Order — We hand-stretch every crust and layer our toppings fresh only when you order.",
  "Quality Without Compromise — We take pride in serving food that is both high in quality and pocket-friendly, ensuring every customer walks away satisfied.",
  "Community First — More than just a pizza place, we are a neighborhood kitchen dedicated to spreading joy through comfort food.",
];

const galleryImages = [
  {
    src: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
    alt: "Hand kneading fresh sourdough dough",
    caption: "Hand Kneading Dough",
  },
  {
    src: "https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=800&q=80",
    alt: "Wood-fired oven baking our pizzas",
    caption: "Wood-Fired Oven",
  },
  {
    src: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80",
    alt: "Spreading tomato sauce on a pizza base",
    caption: "Spreading Sauce",
  },
  {
    src: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80",
    alt: "Freshly baked artisan pizza",
    caption: "Fresh Baked Pizza",
  },
];

export default function AboutPage() {
  return (
    <div className="-mx-5 -mt-6 md:-mx-10">
      {/* Page hero — full-bleed; content spans the banner width */}
      <section className="relative left-1/2 h-[320px] w-screen -translate-x-1/2 overflow-hidden md:h-[400px]">
        <Image
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&q=80"
          alt="Pokket Pizza kitchen team at work"
          fill
          loading="eager"
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />
        <div className="relative flex h-full flex-col justify-center px-5 text-white md:px-10">
          <h1 className="font-heading text-h1-alt font-extrabold leading-[1.05] text-white md:text-display-l">
            Our Story & Passion
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-10 md:px-10 md:py-16">
        {/* Intro */}
        <section>
          <p className="max-w-3xl text-body leading-relaxed text-bodySecondary">
            Welcome to Pokket Pizza, where our passion for great food meets a commitment to
            quality you can taste in every single bite. We believe that exceptional pizza
            doesn&apos;t have to be complicated — it just has to be made with the right
            ingredients, a whole lot of heart, and a dedication to authentic craft.
          </p>
        </section>

        {/* Our heritage — charcoal dark section for storytelling (brand personality) */}
        <section className="mt-12 rounded-2xl bg-charcoal p-6 text-white shadow-card md:p-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">
              <h2 className="font-heading text-h3 font-extrabold text-white md:text-h2">Our Heritage</h2>
              {storyParagraphs.map((paragraph, index) => (
                <p key={index} className="mt-4 text-body leading-relaxed text-white/85">
                  {paragraph}
                </p>
              ))}
            </div>
            <figure className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-card lg:col-span-5">
              <blockquote className="text-body italic leading-relaxed text-bodySecondary">
                &ldquo;{foundersQuote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 place-items-center rounded-full bg-blushTint font-heading text-label font-bold text-brand-red"
                >
                  M&amp;L
                </span>
                <span>
                  <span className="block font-heading text-label font-bold text-charcoal">
                    Marco &amp; Leo
                  </span>
                  <span className="block text-caption text-bodySecondary">
                    Co-Founders, Pokket Pizza
                  </span>
                </span>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* The secret is in the dough */}
        <section className="mt-10">
          <h2 className="font-heading text-h3 font-extrabold text-charcoal md:text-h2">
            The Secret Is in the Dough — Our Specialty
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {doughParagraphs.map((paragraph, index) => (
              <p
                key={index}
                className="rounded-md bg-white p-4 text-body leading-relaxed text-bodySecondary shadow-card ring-1 ring-border-default"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        {/* Sourcing & ingredients */}
        <section className="mt-10">
          <h2 className="font-heading text-h3 font-extrabold text-charcoal md:text-h2">
            Sourcing &amp; Ingredients
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {sourcingParagraphs.map((paragraph, index) => (
              <p
                key={index}
                className="rounded-md bg-white p-4 text-body leading-relaxed text-bodySecondary shadow-card ring-1 ring-border-default"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        {/* Kitchen & craft values */}
        <section className="mt-10">
          <h2 className="font-heading text-h3 font-extrabold text-charcoal md:text-h2">
            Kitchen &amp; Craft Values
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {kitchenParagraphs.map((paragraph, index) => (
              <li
                key={index}
                className="flex items-start gap-3 rounded-md bg-white p-4 text-body leading-relaxed text-bodySecondary shadow-card ring-1 ring-border-default"
              >
                <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-red" />
                <span>{paragraph}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Gallery: store ambiance, pizza preparation and ingredients */}
        <section className="mt-10">
          <h2 className="font-heading text-h3 font-extrabold text-charcoal md:text-h2">
            Behind the Scenes: How We Do It
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {galleryImages.map((image, index) => (
              <figure
                key={index}
                className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-border-default"
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="px-4 py-2 text-caption text-bodySecondary">
                  {image.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* CTA banner */}
        <section className="mt-12 rounded-2xl bg-blushTint p-6 text-center shadow-card ring-1 ring-border-default md:p-10">
          <h2 className="font-heading text-h3 font-extrabold text-brand-red md:text-h2">
            Hungry for Real Sourdough?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-body leading-relaxed text-bodySecondary">
            Get premium wood-fired goodness delivered to your doorstep in minutes.
          </p>
          <Link
            href="/menu"
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-brand-red px-6 py-3 font-heading text-button font-semibold text-white transition-colors hover:bg-red-700 sm:w-fit"
          >
            View Our Menu
          </Link>
        </section>

        {/* Contact strip — kept compact, links onward to /contact */}
        <section className="mt-12 rounded-2xl bg-white p-6 shadow-card ring-1 ring-border-default md:p-8">
          <h2 className="font-heading text-h4 font-extrabold text-charcoal">Find Us</h2>
          <p className="mt-2 text-body text-bodySecondary">
            Visit the shop, call us, or drop us an email — we reply within a day.
          </p>
          <dl className="mt-4 grid grid-cols-1 gap-3 text-body sm:grid-cols-2">
            <div>
              <dt className="font-heading text-label font-semibold uppercase text-mutedGray">
                Address
              </dt>
              <dd className="mt-1 text-body text-bodySecondary">{contact.address}</dd>
            </div>
            <div>
              <dt className="font-heading text-label font-semibold uppercase text-mutedGray">
                Phone
              </dt>
              <dd className="mt-1">
                <a
                  href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`}
                  className="font-heading font-semibold text-brand-red hover:underline"
                >
                  {contact.phone}
                </a>
              </dd>
            </div>
            <div>
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
          </dl>
          <Link
            href="/contact"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-brand-red px-6 py-3 font-heading text-button font-semibold text-white transition-colors hover:bg-red-700"
          >
            Contact Page →
          </Link>
        </section>
      </div>
    </div>
  );
}
