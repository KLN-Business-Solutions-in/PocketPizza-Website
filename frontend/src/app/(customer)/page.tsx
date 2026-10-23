import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Bestsellers } from "@/components/home/Bestsellers";

export const metadata: Metadata = {
  title: "Pokket Pizza — Handmade Pizza, Baked Fresh",
  description:
    "Hand-stretched dough, baked fresh in our oven and delivered piping hot. Order online from Pokket Pizza.",
};

const features = [
  { title: "Handmade Dough Base", text: "Freshly kneaded and hand-stretched every day." },
  { title: "Free Rapid Delivery", text: "Hot & fresh, delivered to your door in under 30 minutes." },
  { title: "Premium Fresh Ingredients", text: "Olives, ripe tomatoes & fresh paneer, prepped daily." },
  { title: "Fast Fire Baking", text: "Baked at over 450°C in under 10 minutes." },
];

const testimonials = [
  {
    quote:
      "Best pizza in our corner of Pune! Soft base, generous cheese and it reached us hot in under 20 minutes.",
    name: "Aditi K.",
  },
  {
    quote:
      "My kids usually leave the crusts, but here they finished the whole pizza. Fresh, hot and worth every rupee.",
    name: "Rohan D.",
  },
  {
    quote:
      "The Paneer Tikka pizza is our Friday ritual now. Great taste, generous toppings and always on time.",
    name: "Sneha P.",
  },
];

export default function HomePage() {
  return (
    <div className="-mx-5 -mt-6 md:-mx-10">
      {/* Hero — full-bleed to the viewport; content spans the banner width */}
      <section className="relative left-1/2 h-[420px] w-screen -translate-x-1/2 overflow-hidden md:h-[540px]">
        <Image
          src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1600&q=80"
          alt="Oven-baked artisan pizza"
          fill
          loading="eager"
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />
        <div className="relative flex h-full flex-col justify-center px-5 text-white md:px-10">
          <h1 className="font-heading text-h1-alt font-extrabold leading-[1.05] md:text-display-l">
            Handmade Pizza.
            <br />
            Delivered Fresh.
          </h1>
          <p className="mt-4 max-w-xl text-body text-white/85">
            Desi twist meets oven-baked perfection — hand-stretched pizza bases loaded with
            bold Indian flavours and authentic Italian soul.
          </p>
          <Link
            href="/menu"
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-brand-red px-6 py-3 font-heading text-button font-semibold text-white transition-colors hover:bg-red-700 md:w-fit"
          >
            View Menu
          </Link>
        </div>
      </section>

      {/* Feature strip */}
      <section className="bg-offWhiteAlt">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-5 py-6 sm:grid-cols-2 md:px-10 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-md bg-white p-4 shadow-card ring-1 ring-border-default">
              <h3 className="font-heading text-h4-alt font-bold text-charcoal">{f.title}</h3>
              <p className="mt-1 text-caption leading-relaxed text-bodySecondary">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bestsellers */}
      <section className="mx-auto max-w-6xl px-5 py-12 md:px-10 md:py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-h2 font-extrabold text-charcoal">
              Our Signature Bestsellers
            </h2>
            <p className="mt-1 text-body text-bodySecondary">
              Baked to perfection in our custom pizza oven.
            </p>
          </div>
          <Link href="/menu" className="shrink-0 font-heading text-label font-semibold text-brand-red hover:underline">
            Browse Full Menu →
          </Link>
        </div>
        <Bestsellers />
      </section>

      {/* Our dough craft — story teaser bridging to the About page */}
      <section className="mx-auto max-w-6xl px-5 py-12 md:px-10 md:py-16">
        <div className="grid grid-cols-1 items-center gap-8 rounded-2xl bg-white p-6 shadow-card ring-1 ring-border-default md:grid-cols-2 md:gap-10 md:p-10">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutralTint">
            <Image
              src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80"
              alt="Hands preparing fresh pizza dough"
              fill
              sizes="(min-width:768px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
          <div>
            <h2 className="font-heading text-h3 font-extrabold text-charcoal md:text-h2">
              Our Dough, Our Craft
            </h2>
            <p className="mt-3 text-body leading-relaxed text-bodySecondary">
              We believe a pizza is only as good as its base. Our dough is made fresh in
              our kitchen, hand-stretched to order, and baked until the crust is golden
              and crisp on the outside, soft on the inside. Simple ingredients, done
              properly — that&apos;s what makes the difference.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-border-default bg-cream-alt py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-5 md:px-10">
          <div className="text-center">
            <h2 className="font-heading text-h2 font-extrabold text-charcoal">Loved by Locals</h2>
            <p className="mt-2 font-heading text-tag font-semibold uppercase tracking-wide text-bodySecondary">
              4.8 / 5 Rating on Google Reviews
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure
                key={t.name}
                className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-card ring-1 ring-border-default"
              >
                <blockquote className="text-body leading-relaxed text-bodySecondary">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 flex items-center justify-between border-t border-border-default pt-3">
                  <span className="font-heading text-label font-bold text-charcoal">{t.name}</span>
                  <span className="text-status-star" role="img" aria-label="5 out of 5 stars">
                    ★★★★★
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
