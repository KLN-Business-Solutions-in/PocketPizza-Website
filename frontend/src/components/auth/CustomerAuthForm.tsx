"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { indianPhoneSchema } from "@shared/contract/contract";
import { ApiError } from "@/lib/api/client";
import {
  useCustomerLogin,
  useCustomerSession,
  useCustomerSignup,
} from "@/lib/api/customerAuth";
import { normalizeIndianPhone } from "@/lib/phone";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

type AuthMode = "login" | "signup";
type FieldErrors = Partial<Record<"name" | "phone" | "email" | "password", string>>;

function isSafeDestination(value: string | null): value is string {
  return Boolean(
    value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !value.startsWith("/admin")
  );
}

function getDestination(next: string | null, redirectTo: string | null): string {
  if (isSafeDestination(next)) return next;
  if (isSafeDestination(redirectTo)) return redirectTo;
  return "/";
}

function Brand() {
  return (
    <div className="flex items-center justify-center gap-2.5" aria-label="Pokket Pizza">
      <Logo className="h-12 w-auto" />
      <span className="font-heading text-[1.45rem] font-extrabold tracking-tight text-charcoal sm:text-[1.55rem]">
        POKKET <span className="text-brand-red">PIZZA</span>
      </span>
    </div>
  );
}

function ErrorIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 7.5v5m0 3h.01" />
    </svg>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <label htmlFor={id} className="mb-1.5 block text-label font-semibold text-charcoal">
        {label}
      </label>
      {children}
      {error && <p className="mt-1.5 text-sm leading-snug text-brand-red" role="alert">{error}</p>}
    </div>
  );
}

export default function CustomerAuthForm({
  mode,
  next = null,
  redirectTo = null,
}: {
  mode: AuthMode;
  next?: string | null;
  redirectTo?: string | null;
}) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const destination = getDestination(next, redirectTo);
  const session = useCustomerSession();
  const login = useCustomerLogin();
  const signup = useCustomerSignup();
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [banner, setBanner] = React.useState<React.ReactNode>(null);
  const submitNavigationRef = React.useRef(false);
  const isPending = login.isPending || signup.isPending;

  // The server and the first client render must agree on the loading shell,
  // even when React Query already has a session snapshot in its client cache.
  const hasMounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  React.useEffect(() => {
    if (session.data?.loggedIn && !submitNavigationRef.current) router.replace(destination);
  }, [destination, router, session.data]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBanner(null);
    const nextErrors: FieldErrors = {};
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (isSignup && !normalizedName) nextErrors.name = "Name is required.";
    else if (isSignup && normalizedName.length > 255) nextErrors.name = "Name must be 255 characters or fewer.";

    const phoneResult = indianPhoneSchema.safeParse(phone);
    let normalizedPhone = "";
    if (!phoneResult.success) {
      nextErrors.phone = "Enter a valid Indian mobile number.";
    } else {
      try {
        normalizedPhone = normalizeIndianPhone(phone);
      } catch {
        nextErrors.phone = "Enter a valid Indian mobile number.";
      }
    }

    if (isSignup && normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    } else if (isSignup && normalizedEmail.length > 255) {
      nextErrors.email = "Email must be 255 characters or fewer.";
    }

    if (isSignup && password.length < 8) nextErrors.password = "Password must be at least 8 characters.";
    else if (password.length < 1) nextErrors.password = "Password is required.";
    else if (password.length > 128) nextErrors.password = "Password must be 128 characters or fewer.";

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    submitNavigationRef.current = true;
    try {
      if (isSignup) {
        await signup.mutateAsync({
          name: normalizedName,
          phone: normalizedPhone,
          password,
          ...(normalizedEmail ? { email: normalizedEmail } : {}),
        });
      } else {
        await login.mutateAsync({ phone: normalizedPhone, password });
      }
      router.replace(destination);
    } catch (error) {
      submitNavigationRef.current = false;
      const apiError = error as ApiError;
      if (!isSignup && (apiError.status === 401 || apiError.code === "AUTHENTICATION_INVALID")) {
        setBanner("Invalid phone or password");
      } else if (apiError.status === 429 || apiError.code === "RATE_LIMITED" || apiError.code === "ACCOUNT_LOCKED") {
        setBanner("Too many attempts. Try again later.");
      } else if (isSignup && apiError.code === "ACCOUNT_EXISTS") {
        setBanner(
          <>An account with this phone already exists. <Link href="/login" className="underline">Log in</Link></>,
        );
      } else if (isSignup && apiError.code === "EMAIL_EXISTS") {
        setFieldErrors((current) => ({ ...current, email: "This email is already registered." }));
      } else if (isSignup && apiError.code === "VALIDATION_ERROR" && /password/i.test(apiError.message)) {
        setFieldErrors((current) => ({ ...current, password: apiError.message }));
      } else {
        setBanner("Something went wrong. Please try again.");
      }
    }
  };

  if (!hasMounted || session.isLoading || session.data?.loggedIn) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-cream-bg px-4 pt-10 pb-28 md:py-10">
        <p className="text-body text-bodySecondary">Checking your account…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center bg-cream-bg px-4 pt-10 pb-28 sm:px-6 md:py-10">
      <div className="w-full max-w-md">
        <section className="w-full rounded-modal border border-border-default bg-white p-6 shadow-elevated sm:p-8" aria-labelledby="customer-auth-title">
          <header className="mb-7 text-center">
            <Brand />
            <h1 id="customer-auth-title" className="mt-5 font-heading text-h3 font-bold text-charcoal">
              {isSignup ? "Create your account" : "Welcome back"}
            </h1>
            {!isSignup && <p className="mt-1 text-caption text-bodySecondary">Log in to see your orders</p>}
          </header>

          {banner && (
            <div role="alert" className="mb-5 flex items-start gap-3 rounded-lg border border-brand-red/20 bg-status-errorBg px-4 py-3 text-left text-caption font-semibold text-brand-red">
              <ErrorIcon />
              <span className="min-w-0 break-words">{banner}</span>
            </div>
          )}

          <form onSubmit={submit} noValidate className="space-y-5">
            {isSignup && (
              <Field id="customer-name" label="Name" error={fieldErrors.name}>
                <input id="customer-name" name="name" type="text" autoComplete="name" required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(fieldErrors.name)} className={`h-12 w-full rounded-lg border bg-white px-3.5 text-body text-charcoal outline-none transition focus:ring-1 ${fieldErrors.name ? "border-brand-red focus:border-brand-red focus:ring-brand-red" : "border-border-default focus:border-border-active focus:ring-border-active"}`} />
              </Field>
            )}

            <Field id="customer-phone" label="Phone" error={fieldErrors.phone}>
              <input id="customer-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} aria-invalid={Boolean(fieldErrors.phone)} className={`h-12 w-full rounded-lg border bg-white px-3.5 text-body text-charcoal outline-none transition focus:ring-1 ${fieldErrors.phone ? "border-brand-red focus:border-brand-red focus:ring-brand-red" : "border-border-default focus:border-border-active focus:ring-border-active"}`} />
            </Field>

            {isSignup && (
              <Field id="customer-email" label="Email (optional)" error={fieldErrors.email}>
                <input id="customer-email" name="email" type="email" autoComplete="email" maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(fieldErrors.email)} className={`h-12 w-full rounded-lg border bg-white px-3.5 text-body text-charcoal outline-none transition focus:ring-1 ${fieldErrors.email ? "border-brand-red focus:border-brand-red focus:ring-brand-red" : "border-border-default focus:border-border-active focus:ring-border-active"}`} />
              </Field>
            )}

            <Field id="customer-password" label="Password" error={fieldErrors.password}>
              <div className="relative">
                <input id="customer-password" name="password" type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} required minLength={isSignup ? 8 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(fieldErrors.password)} className={`h-12 w-full rounded-lg border bg-white px-3.5 pr-12 text-body text-charcoal outline-none transition focus:ring-1 ${fieldErrors.password ? "border-brand-red focus:border-brand-red focus:ring-brand-red" : "border-border-default focus:border-border-active focus:ring-border-active"}`} />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-bodySecondary transition-colors hover:text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-red">
                  {showPassword ? (
                    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.2 9.5 7-.4 1.1-1.2 2.3-2.3 3.4M6.2 6.2C4.2 7.5 2.9 9.5 2.5 12c.8 2.7 4.3 7 9.5 7 1.2 0 2.3-.2 3.3-.6" /></svg>
                  ) : (
                    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
              {isSignup && !fieldErrors.password && (
                <p className="mt-1.5 text-sm leading-snug text-bodySecondary">
                  Use a long passphrase. Avoid common words and patterns.
                </p>
              )}
            </Field>

            <Button type="submit" size="lg" className="h-[52px] w-full rounded-lg text-button font-bold text-white" isLoading={isPending}>
              {isSignup ? "Create account" : "Log in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-caption text-bodySecondary">
            {isSignup ? (
              <>Already have an account? <Link href={`/login?next=${encodeURIComponent(destination)}`} className="font-semibold text-brand-red hover:underline">Log in</Link></>
            ) : (
              <>New here? <Link href={`/signup?next=${encodeURIComponent(destination)}`} className="font-semibold text-brand-red hover:underline">Create an account</Link></>
            )}
          </p>
        </section>
      </div>
    </main>
  );
}
