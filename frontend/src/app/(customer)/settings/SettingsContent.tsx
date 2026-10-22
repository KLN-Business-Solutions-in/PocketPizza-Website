"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, ErrorState, Skeleton } from "@/components/ui/LayoutPrimitives";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/ToastProvider";
import {
  apiErrorMessage,
  useCancelDeletion,
  useChangePassword,
  useCreateAddress,
  useCustomerProfile,
  useDeleteAddress,
  useRequestDeletion,
  useUpdateAddress,
  useUpdatePreferences,
} from "@/lib/api/customer";
import { useCustomerLogout } from "@/lib/api/customerAuth";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type AddressDraft = {
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  pincode: string;
};

const EMPTY_DRAFT: AddressDraft = {
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  pincode: "",
};

type AddressDraftErrors = Partial<Record<keyof AddressDraft, string>>;

function validateAddress(draft: AddressDraft): AddressDraftErrors {
  const errors: AddressDraftErrors = {};
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
  const [draft, setDraft] = useState<AddressDraft>({ ...EMPTY_DRAFT, ...initial });
  const [errors, setErrors] = useState<AddressDraftErrors>({});

  const setField =
    (key: keyof AddressDraft) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setDraft((previous) => ({ ...previous, [key]: event.target.value }));
      setErrors((previous) => ({ ...previous, [key]: undefined }));
    };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateAddress(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(draft);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-3 space-y-3 rounded-md border border-border-default bg-offWhiteAlt p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Address line"
          aria-label="Address line"
          className="sm:col-span-2"
          value={draft.line1}
          error={errors.line1}
          maxLength={255}
          placeholder="Flat 203, Sai Residency"
          onChange={setField("line1")}
        />
        <Input
          label="Apartment / floor (optional)"
          aria-label="Apartment / floor (optional)"
          className="sm:col-span-2"
          value={draft.line2}
          maxLength={255}
          onChange={setField("line2")}
        />
        <Input
          label="City"
          aria-label="City"
          value={draft.city}
          error={errors.city}
          maxLength={100}
          placeholder="Pune"
          onChange={setField("city")}
        />
        <Input
          label="Pincode"
          aria-label="Pincode"
          value={draft.pincode}
          error={errors.pincode}
          inputMode="numeric"
          maxLength={6}
          placeholder="411001"
          onChange={setField("pincode")}
        />
        <Input
          label="Landmark (optional)"
          aria-label="Landmark (optional)"
          className="sm:col-span-2"
          value={draft.landmark}
          maxLength={255}
          placeholder="Near Park"
          onChange={setField("landmark")}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={saving}>
          Save address
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={onCancel}>
          Discard
        </Button>
      </div>
    </form>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-4 scroll-mt-24">
      <Card>
        <h2 className="font-heading text-h4 font-bold text-charcoal">{title}</h2>
        {description && <p className="mt-1 text-caption text-bodySecondary">{description}</p>}
        {children}
      </Card>
    </section>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  busy,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  busy: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-label font-medium text-charcoal">{title}</p>
        <p className="mt-1 text-caption leading-relaxed text-bodySecondary">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} busy={busy} />
    </div>
  );
}

export function SettingsContent() {
  const profile = useCustomerProfile();
  const preferences = useUpdatePreferences();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const changePassword = useChangePassword();
  const requestDeletion = useRequestDeletion();
  const cancelDeletion = useCancelDeletion();
  const logout = useCustomerLogout();
  const router = useRouter();
  const toast = useToast();

  const [addingAddress, setAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwErrors, setPwErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirm?: string;
  }>({});

  const [confirmDeletion, setConfirmDeletion] = useState(false);

  const onTogglePreference = (
    key: "whatsappOrderUpdates" | "whatsappStatusUpdates",
    value: boolean
  ) => {
    preferences.mutate(
      { [key]: value },
      {
        onSuccess: () => toast.push("Preference saved.", "success"),
        onError: (error) =>
          toast.push(apiErrorMessage(error, "Couldn't save that preference."), "error"),
      }
    );
  };

  const onChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof pwErrors = {};
    if (!pwCurrent) nextErrors.currentPassword = "Enter your current password.";
    if (pwNew.length < 8) nextErrors.newPassword = "Use at least 8 characters.";
    if (pwConfirm !== pwNew) nextErrors.confirm = "Passwords don't match.";
    setPwErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    try {
      await changePassword.mutateAsync({ currentPassword: pwCurrent, newPassword: pwNew });
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
      setShowPasswordForm(false);
      toast.push("Password updated.", "success");
    } catch (error) {
      toast.push(apiErrorMessage(error, "Couldn't update password."), "error");
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
          message={apiErrorMessage(profile.error, "Couldn't load your settings.")}
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
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  const { customer, preferences: prefs, addresses } = profile.data;
  const addressesFull = addresses.length >= 10;
  const deletionPending = Boolean(customer.deletionRequestedAt);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 md:py-10">
      <h1 className="font-heading text-h2 font-bold text-charcoal">Settings</h1>
      <p className="mt-1 text-body text-bodySecondary">
        Preferences, delivery addresses and account security.
      </p>

      <section className="mt-6">
        <Card>
          <h2 className="font-heading text-h4 font-bold text-charcoal">Notifications</h2>
          <div className="mt-1 divide-y divide-border-default">
            <ToggleRow
              title="WhatsApp order confirmations"
              description="Receive a WhatsApp message when your order is placed."
              checked={prefs.whatsappOrderUpdates}
              busy={preferences.isPending}
              onChange={(value) => onTogglePreference("whatsappOrderUpdates", value)}
            />
            <ToggleRow
              title="WhatsApp status updates"
              description="Get prep, dispatch and delivery pings on WhatsApp."
              checked={prefs.whatsappStatusUpdates}
              busy={preferences.isPending}
              onChange={(value) => onTogglePreference("whatsappStatusUpdates", value)}
            />
          </div>
        </Card>
      </section>

      <Section
        id="addresses"
        title="Addresses"
        description={
          addressesFull
            ? "Limit reached — you can keep 10 saved addresses."
            : "Delivery addresses saved to your account."
        }
      >
        {!addressesFull && (
          <div className="mt-3">
            {addingAddress || editingAddressId ? null : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setConfirmDeleteId(null);
                  setAddingAddress(true);
                }}
              >
                Add address
              </Button>
            )}
          </div>
        )}

        {addingAddress && (
          <AddressForm
            saving={createAddress.isPending}
            onCancel={() => setAddingAddress(false)}
            onSubmit={(draft) =>
              createAddress.mutate(toCreateBody(draft), {
                onSuccess: () => {
                  setAddingAddress(false);
                  toast.push("Address saved.", "success");
                },
                onError: (error) =>
                  toast.push(apiErrorMessage(error, "Couldn't save address."), "error"),
              })
            }
          />
        )}

        {addresses.length === 0 && !addingAddress && (
          <p className="mt-3 text-body text-bodySecondary">No saved addresses yet.</p>
        )}

        {addresses.length > 0 && (
          <ul className="mt-3 space-y-2">
            {addresses.map((address) => (
              <li key={address.id} className="rounded-md border border-border-default bg-offWhiteAlt px-3.5 py-3">
                {editingAddressId === address.id ? (
                  <AddressForm
                    initial={{
                      line1: address.line1,
                      line2: address.line2 ?? "",
                      landmark: address.landmark ?? "",
                      city: address.city,
                      pincode: address.pincode,
                    }}
                    saving={updateAddress.isPending}
                    onCancel={() => setEditingAddressId(null)}
                    onSubmit={(draft) =>
                      updateAddress.mutate(
                        { id: address.id, ...toUpdateBody(draft) },
                        {
                          onSuccess: () => {
                            setEditingAddressId(null);
                            toast.push("Address updated.", "success");
                          },
                          onError: (error) =>
                            toast.push(
                              apiErrorMessage(error, "Couldn't update address."),
                              "error"
                            ),
                        }
                      )
                    }
                  />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-body text-charcoal">
                        {address.line1}
                        {address.line2 ? `, ${address.line2}` : ""}
                        {address.landmark ? `, ${address.landmark}` : ""}
                      </p>
                      <p className="mt-0.5 text-caption text-bodySecondary">
                        {address.city} — {address.pincode}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAddingAddress(false);
                          setConfirmDeleteId(null);
                          setEditingAddressId(address.id);
                        }}
                      >
                        Edit
                      </Button>
                      {confirmDeleteId === address.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="danger"
                            isLoading={deleteAddress.isPending}
                            onClick={() =>
                              deleteAddress.mutate(address.id, {
                                onSuccess: () => {
                                  setConfirmDeleteId(null);
                                  toast.push("Address removed.", "success");
                                },
                                onError: (error) =>
                                  toast.push(
                                    apiErrorMessage(error, "Couldn't remove address."),
                                    "error"
                                  ),
                              })
                            }
                          >
                            Confirm delete
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={deleteAddress.isPending}
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Keep editing
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingAddressId(null);
                            setConfirmDeleteId(address.id);
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Account"
        description={`Signed in as ${customer.name} · ${customer.phone}`}
      >
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPasswordForm((value) => !value)}
          >
            {showPasswordForm ? "Close" : "Change password"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleLogout} isLoading={logout.isPending}>
            {logout.isPending ? "Logging out…" : "Log out"}
          </Button>
        </div>

        {showPasswordForm && (
          <form onSubmit={onChangePassword} noValidate className="mt-4 space-y-3">
            <Input
              label="Current password"
              aria-label="Current password"
              type="password"
              autoComplete="current-password"
              value={pwCurrent}
              error={pwErrors.currentPassword}
              onChange={(event) => {
                setPwCurrent(event.target.value);
                setPwErrors((previous) => ({ ...previous, currentPassword: undefined }));
              }}
            />
            <Input
              label="New password"
              aria-label="New password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={pwNew}
              error={pwErrors.newPassword}
              placeholder="At least 8 characters"
              onChange={(event) => {
                setPwNew(event.target.value);
                setPwErrors((previous) => ({ ...previous, newPassword: undefined }));
              }}
            />
            <Input
              label="Confirm new password"
              aria-label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={pwConfirm}
              error={pwErrors.confirm}
              onChange={(event) => {
                setPwConfirm(event.target.value);
                setPwErrors((previous) => ({ ...previous, confirm: undefined }));
              }}
            />
            <Button type="submit" size="sm" isLoading={changePassword.isPending}>
              Update password
            </Button>
          </form>
        )}
      </Section>

      <Section
        title="Account deletion"
        description="Removal is scheduled as a request you can cancel."
      >
        {deletionPending ? (
          <div className="mt-3 rounded-md border border-border-default bg-neutralTint px-4 py-3">
            <p className="text-body text-charcoal">
              Deletion requested on {formatDate(customer.deletionRequestedAt!)}. Your account
              will be removed once the review window ends.
            </p>
            <p className="mt-1 text-caption text-bodySecondary">
              Changed your mind? You can cancel any time.
            </p>
            <Button
              className="mt-3"
              size="sm"
              variant="outline"
              isLoading={cancelDeletion.isPending}
              onClick={() =>
                cancelDeletion.mutate(undefined, {
                  onSuccess: () => toast.push("Deletion request withdrawn.", "success"),
                  onError: (error) =>
                    toast.push(
                      apiErrorMessage(error, "Couldn't withdraw the request."),
                      "error"
                    ),
                })
              }
            >
              Withdraw deletion request
            </Button>
          </div>
        ) : confirmDeletion ? (
          <div
            role="alert"
            className="mt-3 rounded-md border border-brand-red bg-status-errorBg px-4 py-3"
          >
            <p className="text-body font-medium text-brand-red">
              Request deletion of your account? Your profile, saved addresses and order
              history will be scheduled for removal.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="danger"
                isLoading={requestDeletion.isPending}
                onClick={() =>
                  requestDeletion.mutate(undefined, {
                    onSuccess: () => {
                      setConfirmDeletion(false);
                      toast.push(
                        "Account deletion requested. You can withdraw it from this page.",
                        "info"
                      );
                    },
                    onError: (error) =>
                      toast.push(
                        apiErrorMessage(error, "Couldn't request deletion."),
                        "error"
                      ),
                  })
                }
              >
                Yes, request deletion
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={requestDeletion.isPending}
                onClick={() => setConfirmDeletion(false)}
              >
                Keep my account
              </Button>
            </div>
          </div>
        ) : (
          <Button className="mt-3" size="sm" variant="danger" onClick={() => setConfirmDeletion(true)}>
            Request account deletion
          </Button>
        )}
      </Section>
    </div>
  );
}
