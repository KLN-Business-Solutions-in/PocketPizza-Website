import React from "react";
import CustomerAuthForm from "@/components/auth/CustomerAuthForm";

export default function CustomerSignupPage() {
  return (
    <React.Suspense fallback={<main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-cream-bg px-4 text-bodySecondary">Loading…</main>}>
      <CustomerAuthForm mode="signup" />
    </React.Suspense>
  );
}
