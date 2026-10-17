"use client";

import React, { useState } from "react";

/**
 * Contact form — fields Name, Email, Subject and Message.
 *
 * Email delivery itself is handled by the backend (see the contact-content
 * issue). Until that endpoint exists, the form validates locally and shows
 * an optimistic confirmation instead of a network call.
 */
export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const problems: string[] = [];
    if (name.trim().length === 0) problems.push("Please tell us your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      problems.push("Please enter a valid email address.");
    }
    if (message.trim().length < 10) {
      problems.push("Please write a message of at least 10 characters.");
    }
    if (problems.length > 0) {
      setError(problems.join(" "));
      return;
    }

    // Backend delivery is not implemented yet — confirm locally.
    setSent(true);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <label htmlFor="contact-name" className="font-heading text-label font-semibold text-charcoal">
          Name
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 w-full rounded-sm border border-border-default bg-white px-3 py-2 text-body text-charcoal placeholder:text-mutedGray focus:border-border-active focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="contact-email" className="font-heading text-label font-semibold text-charcoal">
          Email
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-sm border border-border-default bg-white px-3 py-2 text-body text-charcoal placeholder:text-mutedGray focus:border-border-active focus:outline-none"
        />
      </div>
      <div className="md:col-span-2">
        <label htmlFor="contact-subject" className="font-heading text-label font-semibold text-charcoal">
          Subject
        </label>
        <input
          id="contact-subject"
          name="subject"
          type="text"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="mt-1 w-full rounded-sm border border-border-default bg-white px-3 py-2 text-body text-charcoal placeholder:text-mutedGray focus:border-border-active focus:outline-none"
        />
      </div>
      <div className="md:col-span-2">
        <label htmlFor="contact-message" className="font-heading text-label font-semibold text-charcoal">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="mt-1 w-full rounded-sm border border-border-default bg-white px-3 py-2 text-body text-charcoal placeholder:text-mutedGray focus:border-border-active focus:outline-none"
        />
      </div>
      <div className="md:col-span-2">
        {error && (
          <p role="alert" className="text-body font-medium text-brand-red">
            {error}
          </p>
        )}
        {sent && (
          <p role="status" className="text-body font-medium text-charcoal">
            Thanks for your message — we&apos;ll get back to you shortly.
          </p>
        )}
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-full bg-brand-red px-6 py-3 font-heading text-button font-semibold text-white transition-colors hover:bg-red-700 md:w-fit"
        >
          Send Message
        </button>
      </div>
    </form>
  );
}
