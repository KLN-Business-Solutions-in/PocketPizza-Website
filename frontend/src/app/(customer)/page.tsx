import Image from "next/image";
import Link from "next/link";
import { Bestsellers } from "@/components/home/Bestsellers";

const features = [
  { title: "Handmade Sourdough Base", text: "48h slow proof crust fermented naturally" },
  { title: "Free Rapid Delivery", text: "No charge under 1.5km local radius" },
  { title: "Premium Fresh Ingredients", text: "No frozen toppings, only authentic produce" },
  { title: "Fast Fire Baking", text: "Wood-fired oven fresh bake in 180 seconds" },
];

export default function HomePage() {
  return (
    <div className="-mx-5 -mt-6 md:-mx-10">
      {/* Hero */}
      <section className="relative h-[420px] overflow-hidden md:h-[540px]">
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
          <span className="w-fit rounded-md bg-brand-red px-3 py-1 font-heading text-tag font-semibold uppercase tracking-wide">
            London&apos;s Finest Artisan Pizza
          </span>
          <h1 className="mt-5 font-heading text-h1-alt font-extrabold leading-[1.05] md:text-display-l">
            Handmade Pizza.
            <br />
            Delivered Fresh.
          </h1>
          <p className="mt-4 max-w-md text-body text-white/85">
            Craving naturally proofed, wood-fired dough? Hand-stretched sourdough bases topped with
            premium imported fresh ingredients.
          </p>
          <Link
            href="/menu"
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-brand-red px-6 py-3 font-heading text-button font-semibold text-white transition-colors hover:bg-red-700 md:w-fit"
          >
            View Menu
          </Link>
        </div>
      </section>

      {/* Feature strip: hidden on mobile, matches Figma desktop */}
      <section className="hidden bg-offWhiteAlt md:block">
        <div className="mx-auto grid max-w-6xl grid-cols-4 gap-4 px-10 py-6">
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
              <span className="hidden md:inline">Our Signature Bestsellers</span>
              <span className="md:hidden">Hot Highlights</span>
            </h2>
            <p className="mt-1 hidden text-body text-bodySecondary md:block">
              Baked to perfection in our custom wood-fired deck oven.
            </p>
          </div>
          <Link href="/menu" className="shrink-0 font-heading text-label font-semibold text-brand-red hover:underline">
            <span className="hidden md:inline">Browse Full Menu →</span>
            <span className="md:hidden">See All →</span>
          </Link>
        </div>
        <Bestsellers />
      </section>

      {/* Contact strip (compact — /contact carries the full block) */}
      <section id="contact" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-16 md:px-10">
        <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-border-default md:p-8">
          <h2 className="font-heading text-h3 font-extrabold text-charcoal">Find us</h2>
          <p className="mt-2 text-body text-bodySecondary">
            Open daily 11:30–23:00 · Free delivery under 1.5km
          </p>
          <p className="mt-2 text-body text-bodySecondary">
            Call us on{" "}
            <a
              href="tel:08788197404"
              className="font-heading font-semibold text-brand-red hover:underline"
            >
              087881 97404
            </a>
            {" · "}
            <a
              href="mailto:pocketpizzawebsite@gmail.com"
              className="font-heading font-semibold text-brand-red hover:underline"
            >
              pocketpizzawebsite@gmail.com
            </a>
          </p>
          <p className="mt-1 text-body text-bodySecondary">
            Shop no.2, opp, Amba Mata Mandir- Raj Basera Society Rd, Sukhsagar
            Nagar, Hastinapuram, Pune, Maharashtra 411046
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/menu"
              className="inline-flex w-full items-center justify-center rounded-full bg-brand-red px-6 py-3 font-heading text-button font-semibold text-white transition-colors hover:bg-red-700 sm:w-fit"
            >
              Order now
            </Link>
            <Link
              href="/cart"
              className="inline-flex w-full items-center justify-center rounded-full bg-blushTint px-6 py-3 font-heading text-button font-semibold text-brand-red transition-colors hover:bg-brand-red hover:text-white sm:w-fit"
            >
              View cart
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
