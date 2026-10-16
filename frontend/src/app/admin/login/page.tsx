"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminLogin } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/LayoutPrimitives";

/**
 * Admin login — Backend Master Reference §9.
 * POST /api/v1/auth/login sets __Host- HttpOnly cookies.
 * No token in JS, no localStorage. Rate-limited 10/15min (§20.5).
 */
export default function AdminLoginPage() {
  return (
    <React.Suspense fallback={<p className="p-6 text-body text-bodySecondary">Loading login…</p>}>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAdminLogin();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // Normalize email per §9.4 (lowercase + trim) before sending.
      await login.mutateAsync({
        email: email.trim().toLowerCase(),
        password,
      });
      const redirectTo = searchParams.get("redirectTo");
      const destination =
        redirectTo === "/admin" || redirectTo?.startsWith("/admin/")
          ? redirectTo
          : "/admin/dashboard";
      router.push(destination);
    } catch (err) {
      const api = err as ApiError;
      if (api?.status === 429) {
        setError("Too many attempts. Please wait 15 minutes and try again.");
      } else {
        setError(api?.message || "Invalid email or password.");
      }
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-cream-bg px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <Card className="w-full rounded-modal border border-border-default bg-white p-6 shadow-elevated sm:p-8">
          <header className="mb-7 text-center">
            <div className="flex items-center justify-center gap-2.5" aria-label="Pokket Pizza">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-red text-white">
                <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 32 32" fill="none">
                  <path d="M7 23.5 13.2 6.8c.3-.8 1.3-1.1 2-.5l12 10.8c.8.7.5 2-.5 2.3L8.4 25.2c-1 .3-1.8-.7-1.4-1.7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="m12.1 20.9 7.3-2.2-5.1-4.6-2.2 6.8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <circle cx="17.3" cy="17.1" r="1" fill="currentColor" />
                  <circle cx="20.4" cy="19.2" r="1" fill="currentColor" />
                  <circle cx="15.3" cy="19.9" r="1" fill="currentColor" />
                </svg>
              </span>
              <span className="font-heading text-[1.55rem] font-extrabold tracking-tight text-charcoal">POKKET <span className="text-brand-red">PIZZA</span></span>
            </div>
            <h1 className="mt-5 font-heading text-h3 font-bold text-charcoal">
              Restaurant Admin
            </h1>
          </header>

          {searchParams.get("reason") === "expired" && (
            <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-caption text-amber-900" role="status">
              Your session expired. Please sign in again.
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="flex items-center gap-3 rounded-lg border border-brand-red/20 bg-status-errorBg px-4 py-3 text-left text-caption font-semibold text-brand-red"
              >
                <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" d="M12 7.5v5m0 3h.01" />
                </svg>
                <span className="min-w-0 break-words">{error}</span>
              </div>
            )}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={255}
              autoComplete="username"
              className={error ? "border-brand-red focus:border-brand-red focus:ring-brand-red" : ""}
            />
            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={128}
                autoComplete="current-password"
                className={`pr-12 ${error ? "border-brand-red focus:border-brand-red focus:ring-brand-red" : ""}`}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-3 top-[2.15rem] rounded p-1 text-bodySecondary transition-colors hover:text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-red"
              >
                {showPassword ? (
                  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.2 9.5 7-.4 1.1-1.2 2.3-2.3 3.4M6.2 6.2C4.2 7.5 2.9 9.5 2.5 12c.8 2.7 4.3 7 9.5 7 1.2 0 2.3-.2 3.3-.6" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            <Button type="submit" size="lg" className="h-[52px] w-full rounded-lg" isLoading={login.isPending}>
              Login to Dashboard
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
