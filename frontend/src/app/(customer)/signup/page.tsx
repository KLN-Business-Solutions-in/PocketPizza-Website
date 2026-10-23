import CustomerAuthForm from "@/components/auth/CustomerAuthForm";

export default async function CustomerSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string | string[] }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <CustomerAuthForm
      mode="signup"
      redirectTo={typeof redirectTo === "string" ? redirectTo : null}
    />
  );
}
