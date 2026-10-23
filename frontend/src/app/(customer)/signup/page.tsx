import CustomerAuthForm from "@/components/auth/CustomerAuthForm";

export default async function CustomerSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; redirectTo?: string | string[] }>;
}) {
  const { next, redirectTo } = await searchParams;

  return (
    <CustomerAuthForm
      mode="signup"
      redirectTo={typeof next === "string" ? next : typeof redirectTo === "string" ? redirectTo : null}
    />
  );
}
