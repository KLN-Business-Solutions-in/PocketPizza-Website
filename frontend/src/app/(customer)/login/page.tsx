import CustomerAuthForm from "@/components/auth/CustomerAuthForm";

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string | string[] }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <CustomerAuthForm
      mode="login"
      redirectTo={typeof redirectTo === "string" ? redirectTo : null}
    />
  );
}
