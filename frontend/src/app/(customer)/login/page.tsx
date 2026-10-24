import CustomerAuthForm from "@/components/auth/CustomerAuthForm";

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; redirectTo?: string | string[] }>;
}) {
  const { next, redirectTo } = await searchParams;

  return (
    <CustomerAuthForm
      mode="login"
      next={typeof next === "string" ? next : null}
      redirectTo={typeof redirectTo === "string" ? redirectTo : null}
    />
  );
}
