"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, EmptyState, ErrorState, Skeleton } from "@/components/ui/LayoutPrimitives";
import { useToast } from "@/components/ui/ToastProvider";
import { apiErrorMessage, useCustomerProfile, useUpdateProfile } from "@/lib/api/customer";
import { useCustomerLogout, useCustomerSession } from "@/lib/api/customerAuth";
import { useCurrentOrders } from "@/lib/api/orders";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-heading text-h4 font-bold text-charcoal">{children}</h2>;
}

export function ProfileContent() {
  const session = useCustomerSession();
  const phone = session.data?.loggedIn ? session.data.customer.phone : null;
  const profile = useCustomerProfile();
  const updateProfile = useUpdateProfile();
  const logout = useCustomerLogout();
  const orders = useCurrentOrders(phone);
  const toast = useToast();
  const router = useRouter();

  const [nameEditing, setNameEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (trimmed.length < 2) {
      setNameError("Name must be at least 2 characters.");
      return;
    }
    setNameError(null);
    try {
      await updateProfile.mutateAsync({ name: trimmed });
      setNameEditing(false);
      toast.push("Name updated.", "success");
    } catch (error) {
      toast.push(apiErrorMessage(error, "Couldn't update name."), "error");
    }
  };

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
      router.replace("/");
    } catch {
      toast.push("Unable to log out. Please try again.", "error");
    }
  };

  if (profile.isError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <ErrorState
          message={apiErrorMessage(profile.error, "Couldn't load your profile.")}
          onRetry={() => profile.refetch()}
        />
      </div>
    );
  }

  if (!profile.data) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6" aria-busy="true">
        <Skeleton className="h-8 w-40" />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  const { customer, addresses } = profile.data;
  const orderList = [...(orders.data ?? [])]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-h2 font-bold text-charcoal">Profile</h1>
        <Button variant="outline" size="sm" onClick={handleLogout} isLoading={logout.isPending}>
          {logout.isPending ? "Logging out…" : "Log out"}
        </Button>
      </div>
      <p className="mt-1 text-body text-bodySecondary">
        Your account details, saved addresses and order history.
      </p>

      {customer.deletionRequestedAt && (
        <div
          role="status"
          className="mt-4 rounded-md border border-border-default bg-neutralTint px-4 py-3 text-body text-charcoal"
        >
          Account deletion requested on {formatDate(customer.deletionRequestedAt)}.{" "}
          <Link href="/settings" className="font-semibold text-brand-red underline">
            Manage in Settings
          </Link>
        </div>
      )}

      <section className="mt-6">
        <Card>
          <div className="flex items-start gap-4">
            <span
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-blushTint font-heading text-h3 font-bold text-brand-red"
              aria-hidden="true"
            >
              {customer.name.trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <SectionTitle>Account</SectionTitle>
              {!nameEditing ? (
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-label font-medium text-charcoal">
                      {customer.name}
                    </p>
                    <p className="mt-1.5 text-caption text-bodySecondary">
                      {customer.phone}
                    </p>
                    <p className="mt-1.5 text-caption text-bodySecondary">
                      {customer.email ?? "No email added"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNameDraft(customer.name);
                      setNameEditing(true);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <Input
                    label="Name"
                    aria-label="Name"
                    value={nameDraft}
                    error={nameError ?? undefined}
                    maxLength={255}
                    autoFocus
                    onChange={(event) => {
                      setNameDraft(event.target.value);
                      if (nameError) setNameError(null);
                    }}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveName} isLoading={updateProfile.isPending}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={updateProfile.isPending}
                      onClick={() => {
                        setNameEditing(false);
                        setNameError(null);
                      }}
                    >
                      Discard
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-4">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <SectionTitle>Addresses</SectionTitle>
            <Link
              href="/settings#addresses"
              className="text-caption font-semibold text-brand-red hover:underline"
            >
              Manage in Settings
            </Link>
          </div>
          {addresses.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="No saved addresses"
                description="Add delivery addresses from Settings and they will show up here."
                action={
                  <Link
                    href="/settings#addresses"
                    className="inline-flex items-center justify-center rounded-md bg-brand-red px-4 py-2.5 font-heading text-button font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-brand-red"
                  >
                    Add address
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {addresses.map((address) => (
                <li
                  key={address.id}
                  className="rounded-md border border-border-default bg-offWhiteAlt px-3.5 py-2.5"
                >
                  <p className="text-body text-charcoal">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}
                    {address.landmark ? `, ${address.landmark}` : ""}
                  </p>
                  <p className="mt-0.5 text-caption text-bodySecondary">
                    {address.city} — {address.pincode}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="mt-4">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <SectionTitle>Orders</SectionTitle>
            {orders.data && (
              <span className="text-caption text-bodySecondary">
                {orders.data.length} {orders.data.length === 1 ? "order" : "orders"}
              </span>
            )}
          </div>
          {orders.isLoading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : orders.isError ? (
            <div className="mt-3">
              <ErrorState
                message={apiErrorMessage(orders.error, "Couldn't load your orders.")}
                onRetry={() => orders.refetch()}
              />
            </div>
          ) : orderList.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="No orders yet"
                description="When you place an order it will show up here."
                action={
                  <Link
                    href="/menu"
                    className="inline-flex items-center justify-center rounded-md bg-brand-red px-4 py-2.5 font-heading text-button font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-brand-red"
                  >
                    Browse the menu
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-border-default">
              {orderList.map((order) => (
                <li key={order.orderNumber}>
                  <Link
                    href={`/order/${order.publicToken}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-label font-medium text-charcoal">
                        #{order.orderNumber}
                      </p>
                      <p className="mt-1 text-caption text-bodySecondary">
                        {order.itemCount} {order.itemCount === 1 ? "item" : "items"} ·{" "}
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-label font-semibold text-charcoal">₹{order.total}</p>
                      <p className="mt-1 text-caption text-bodySecondary">{order.status}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
