"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, ErrorState, Skeleton } from "@/components/ui/LayoutPrimitives";
import { useToast } from "@/components/ui/ToastProvider";
import {
  apiErrorMessage,
  useCreateAddress,
  useCustomerProfile,
  useDeleteAddress,
  useUpdateAddress,
  useUpdateProfile,
} from "@/lib/api/customer";
import { useCustomerLogout } from "@/lib/api/customerAuth";
import { PasswordCard } from "@/components/profile/PasswordCard";

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

type AddressDraft = {
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  pincode: string;
};

const EMPTY_ADDRESS: AddressDraft = {
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  pincode: "",
};

type AddressErrors = Partial<Record<keyof AddressDraft, string>>;

function validateAddress(draft: AddressDraft): AddressErrors {
  const errors: AddressErrors = {};
  if (!draft.line1.trim()) errors.line1 = "Address line is required.";
  if (!draft.city.trim()) errors.city = "City is required.";
  if (!/^\d{6}$/.test(draft.pincode.trim())) errors.pincode = "Enter a 6-digit pincode.";
  return errors;
}

function toCreateBody(draft: AddressDraft) {
  return {
    line1: draft.line1.trim(),
    ...(draft.line2.trim() ? { line2: draft.line2.trim() } : {}),
    ...(draft.landmark.trim() ? { landmark: draft.landmark.trim() } : {}),
    city: draft.city.trim(),
    pincode: draft.pincode.trim(),
  };
}

function toUpdateBody(draft: AddressDraft) {
  return {
    line1: draft.line1.trim(),
    line2: draft.line2.trim() || null,
    landmark: draft.landmark.trim() || null,
    city: draft.city.trim(),
    pincode: draft.pincode.trim(),
  };
}

function AddressForm({
  initial,
  saving,
  onCancel,
  onSubmit,
}: {
  initial?: Partial<AddressDraft>;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (draft: AddressDraft) => void;
}) {
  const [draft, setDraft] = useState<AddressDraft>({ ...EMPTY_ADDRESS, ...initial });
  const [errors, setErrors] = useState<AddressErrors>({});
  const setField = (key: keyof AddressDraft) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraft((previous) => ({ ...previous, [key]: event.target.value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateAddress(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onSubmit(draft);
  };

  return (
    <form onSubmit={submit} noValidate className="mt-4 space-y-4 rounded-lg border border-border-default bg-offWhiteAlt p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Address line" aria-label="Address line" className="sm:col-span-2" value={draft.line1} error={errors.line1} maxLength={255} placeholder="Flat 203, Sai Residency" onChange={setField("line1")} />
        <Input label="Apartment / floor (optional)" aria-label="Apartment / floor (optional)" className="sm:col-span-2" value={draft.line2} maxLength={255} onChange={setField("line2")} />
        <Input label="City" aria-label="City" value={draft.city} error={errors.city} maxLength={100} placeholder="Pune" onChange={setField("city")} />
        <Input label="Pincode" aria-label="Pincode" value={draft.pincode} error={errors.pincode} inputMode="numeric" maxLength={6} placeholder="411001" onChange={setField("pincode")} />
        <Input label="Landmark (optional)" aria-label="Landmark (optional)" className="sm:col-span-2" value={draft.landmark} maxLength={255} placeholder="Near Park" onChange={setField("landmark")} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" className="min-h-11 w-full sm:w-auto" isLoading={saving}>Save address</Button>
        <Button type="button" className="min-h-11 w-full sm:w-auto" variant="ghost" disabled={saving} onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export function ProfileContent() {
  const profile = useCustomerProfile();
  const updateProfile = useUpdateProfile();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const logout = useCustomerLogout();
  const toast = useToast();
  const router = useRouter();

  const [nameEditing, setNameEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
  const addressesFull = addresses.length >= 10;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-h2 font-bold text-charcoal">Profile</h1>
      </div>
      <p className="mt-1 text-body text-bodySecondary">
        Your account details and saved addresses.
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
                    className="min-h-11 shrink-0"
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
              <div className="mt-4 grid w-full grid-cols-1 gap-2.5 sm:flex sm:w-auto">
                <Button
                  variant="outline"
                  className="h-14 w-full rounded-xl text-base sm:w-auto"
                  onClick={handleLogout}
                  isLoading={logout.isPending}
                >
                  {logout.isPending ? "Logging out…" : "Log out"}
                </Button>
                <PasswordCard />
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-4">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <SectionTitle>Addresses</SectionTitle>
            {!addressesFull && !addingAddress && editingAddressId === null && (
              <Button
                variant="outline"
                className="min-h-11 shrink-0"
                onClick={() => {
                  setConfirmDeleteId(null);
                  setAddingAddress(true);
                }}
              >
                Add address
              </Button>
            )}
          </div>
          {addressesFull && <p className="mt-3 text-caption text-bodySecondary">Limit reached — you can keep 10 saved addresses.</p>}
          {addingAddress && (
            <AddressForm
              saving={createAddress.isPending}
              onCancel={() => setAddingAddress(false)}
              onSubmit={(draft) => createAddress.mutate(toCreateBody(draft), {
                onSuccess: () => {
                  setAddingAddress(false);
                  toast.push("Address saved.", "success");
                },
                onError: (error) => toast.push(apiErrorMessage(error, "Couldn't save address."), "error"),
              })}
            />
          )}
          {addresses.length === 0 && !addingAddress ? (
            <p className="mt-3 rounded-lg border border-dashed border-border-default bg-offWhiteAlt px-4 py-8 text-center text-body text-bodySecondary">No saved addresses yet.</p>
          ) : addresses.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {addresses.map((address) => (
                <li key={address.id} className="rounded-md border border-border-default bg-offWhiteAlt px-3.5 py-3">
                  {editingAddressId === address.id ? (
                    <AddressForm
                      initial={{ line1: address.line1, line2: address.line2 ?? "", landmark: address.landmark ?? "", city: address.city, pincode: address.pincode }}
                      saving={updateAddress.isPending}
                      onCancel={() => setEditingAddressId(null)}
                      onSubmit={(draft) => updateAddress.mutate({ id: address.id, ...toUpdateBody(draft) }, {
                        onSuccess: () => {
                          setEditingAddressId(null);
                          toast.push("Address updated.", "success");
                        },
                        onError: (error) => toast.push(apiErrorMessage(error, "Couldn't update address."), "error"),
                      })}
                    />
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-words text-body text-charcoal">
                          {address.line1}{address.line2 ? `, ${address.line2}` : ""}{address.landmark ? `, ${address.landmark}` : ""}
                        </p>
                        <p className="mt-0.5 text-caption text-bodySecondary">{address.city} — {address.pincode}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:shrink-0">
                        <Button className="min-h-11" size="sm" variant="ghost" onClick={() => {
                          setAddingAddress(false);
                          setConfirmDeleteId(null);
                          setEditingAddressId(address.id);
                        }}>Edit</Button>
                        {confirmDeleteId === address.id ? (
                          <>
                            <Button className="min-h-11" size="sm" variant="danger" isLoading={deleteAddress.isPending} onClick={() => deleteAddress.mutate(address.id, {
                              onSuccess: () => {
                                setConfirmDeleteId(null);
                                toast.push("Address removed.", "success");
                              },
                              onError: (error) => toast.push(apiErrorMessage(error, "Couldn't remove address."), "error"),
                            })}>Confirm delete</Button>
                            <Button className="min-h-11" size="sm" variant="ghost" disabled={deleteAddress.isPending} onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                          </>
                        ) : (
                          <Button className="min-h-11" size="sm" variant="ghost" onClick={() => {
                            setEditingAddressId(null);
                            setConfirmDeleteId(address.id);
                          }}>Delete</Button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </section>
    </div>
  );
}
