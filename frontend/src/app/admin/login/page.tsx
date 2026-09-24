"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAdminLogin } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, ErrorState } from "@/components/ui/LayoutPrimitives";

/**
 * Admin login — Backend Master Reference §9.
 * POST /api/v1/auth/login sets __Host- HttpOnly cookies.
 * No token in JS, no localStorage. Rate-limited 10/15min (§20.5).
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const login = useAdminLogin();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // Normalize email per §9.4 (lowercase + trim) before sending.
      await login.mutateAsync({
        email: email.trim().toLowerCase(),
        password,
      });
      router.push("/admin/dashboard");
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
    <div className="mx-auto max-w-md py-12">
      <h1 className="text-h2 font-heading font-bold">Admin Login</h1>
      <p className="mt-1 text-body text-bodySecondary">
        Cookie-based session. Never store tokens in localStorage.
      </p>
      <Card className="mt-6">
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={255}
            autoComplete="username"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            maxLength={128}
            autoComplete="current-password"
          />
          {error && <ErrorState message={error} />}
          <Button type="submit" className="w-full" isLoading={login.isPending}>
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}
