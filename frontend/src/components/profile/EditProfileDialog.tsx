"use client";

import React from "react";
import { ApiError } from "@/lib/api/client";
import { useUpdateCustomerName } from "@/lib/api/customerProfile";
import { Button } from "@/components/ui/Button";

function getNameFieldError(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || error.status !== 400) return undefined;
  const detail = error.details?.find((item) => /^name(?:\.|:|\s)/i.test(item));
  if (!detail) return error.message || "Enter a valid name.";
  return detail.replace(/^name(?:\.|:|\s)+/i, "").trim() || "Enter a valid name.";
}

export function EditProfileDialog({
  isOpen,
  name: initialName,
  phone,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  name: string;
  phone: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const updateName = useUpdateCustomerName();
  const [name, setName] = React.useState(initialName);
  const [nameError, setNameError] = React.useState<string>();
  const [banner, setBanner] = React.useState<string>();

  React.useEffect(() => {
    if (!isOpen) return;
    setName(initialName);
    setNameError(undefined);
    setBanner(undefined);

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !updateName.isPending) onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [initialName, isOpen, onClose, updateName.isPending]);

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBanner(undefined);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Name is required.");
      return;
    }
    if (trimmedName.length > 255) {
      setNameError("Name must be 255 characters or fewer.");
      return;
    }
    setNameError(undefined);

    try {
      await updateName.mutateAsync({ name: trimmedName });
      onSaved();
    } catch (error) {
      setNameError(getNameFieldError(error));
      setBanner(error instanceof Error ? error.message : "We could not update your profile. Please try again.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !updateName.isPending) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        className="flex max-h-full w-full flex-col overflow-y-auto rounded-t-modal border border-border-default bg-white p-5 shadow-elevated sm:max-h-[90vh] sm:max-w-lg sm:rounded-modal sm:p-6"
      >
        <header className="mb-5 flex items-center justify-between gap-4 border-b border-border-default pb-3">
          <h2 id="edit-profile-title" className="font-heading text-h3 font-bold text-charcoal">Edit details</h2>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            disabled={updateName.isPending}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-bodySecondary hover:bg-neutralTint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red disabled:opacity-50"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        {banner && (
          <p role="alert" className="mb-4 rounded-md border border-brand-red/20 bg-status-errorBg px-3 py-2 text-sm text-brand-red">
            {banner}
          </p>
        )}

        <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-4">
          <div>
            <label htmlFor="edit-profile-name" className="mb-1.5 block text-label font-semibold text-charcoal">Name</label>
            <input
              id="edit-profile-name"
              name="name"
              autoComplete="name"
              maxLength={255}
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? "edit-profile-name-error" : undefined}
              className={`h-12 w-full rounded-lg border bg-white px-3.5 text-body text-charcoal outline-none focus:ring-1 ${nameError ? "border-brand-red focus:border-brand-red focus:ring-brand-red" : "border-border-default focus:border-border-active focus:ring-border-active"}`}
            />
            {nameError && <p id="edit-profile-name-error" role="alert" className="mt-1.5 text-sm leading-snug text-brand-red">{nameError}</p>}
          </div>
          <div>
            <label htmlFor="edit-profile-phone" className="mb-1.5 block text-label font-semibold text-charcoal">Phone (your account ID, can't be changed)</label>
            <input id="edit-profile-phone" type="tel" disabled value={phone} className="h-12 w-full rounded-lg border border-border-default bg-cream-bg px-3.5 text-body text-bodySecondary disabled:opacity-70" />
          </div>
          <footer className="mt-auto flex flex-col-reverse gap-3 border-t border-border-default pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={updateName.isPending} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={updateName.isPending} isLoading={updateName.isPending} className="w-full sm:w-auto">Save changes</Button>
          </footer>
        </form>
      </section>
    </div>
  );
}
