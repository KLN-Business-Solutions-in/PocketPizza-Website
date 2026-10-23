"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/LayoutPrimitives";
import { useToast } from "@/components/ui/ToastProvider";
import { apiErrorMessage, useChangePassword } from "@/lib/api/customer";

type PasswordErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirm?: string;
};

function PasswordField({
  label,
  autoComplete,
  value,
  error,
  visible,
  onToggleVisibility,
  onChange,
  minLength,
}: {
  label: string;
  autoComplete: "current-password" | "new-password";
  value: string;
  error?: string;
  visible: boolean;
  onToggleVisibility: () => void;
  onChange: (value: string) => void;
  minLength?: number;
}) {
  return (
    <div className="relative">
      <Input
        label={label}
        aria-label={label}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        minLength={minLength}
        value={value}
        error={error}
        className="h-12 pr-16"
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="absolute right-1 top-7 min-h-11 min-w-12 rounded-md px-2 text-caption font-semibold text-brand-red hover:bg-blushTint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
        aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
        aria-pressed={visible}
        onClick={onToggleVisibility}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export function PasswordCard() {
  const changePassword = useChangePassword();
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [visibleFields, setVisibleFields] = useState({ current: false, next: false, confirm: false });
  const [isOpen, setIsOpen] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: PasswordErrors = {};
    if (!currentPassword) nextErrors.currentPassword = "Enter your current password.";
    if (newPassword.length < 8) nextErrors.newPassword = "Use at least 8 characters.";
    if (confirmPassword !== newPassword) nextErrors.confirm = "Passwords don't match.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
      toast.push("Password updated.", "success");
      setIsOpen(false);
    } catch (error) {
      toast.push(apiErrorMessage(error, "Couldn't update password."), "error");
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-14 w-full rounded-xl text-base sm:w-auto"
        onClick={() => setIsOpen(true)}
      >
        Update password
      </Button>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-charcoal/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !changePassword.isPending) setIsOpen(false);
          }}
        >
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="update-password-title"
            className="my-auto w-full max-w-lg"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 id="update-password-title" className="font-heading text-h4 font-bold text-charcoal">Update password</h2>
              <Button type="button" variant="ghost" className="min-h-11 min-w-11" disabled={changePassword.isPending} onClick={() => setIsOpen(false)} aria-label="Close password dialog">×</Button>
            </div>
            <form onSubmit={submit} noValidate className="mt-4 space-y-4">
        <PasswordField
          label="Current password"
          autoComplete="current-password"
          value={currentPassword}
          error={errors.currentPassword}
          visible={visibleFields.current}
          onToggleVisibility={() => setVisibleFields((previous) => ({ ...previous, current: !previous.current }))}
          onChange={(value) => {
            setCurrentPassword(value);
            setErrors((previous) => ({ ...previous, currentPassword: undefined }));
          }}
        />
        <PasswordField
          label="New password"
          autoComplete="new-password"
          minLength={8}
          value={newPassword}
          error={errors.newPassword}
          visible={visibleFields.next}
          onToggleVisibility={() => setVisibleFields((previous) => ({ ...previous, next: !previous.next }))}
          onChange={(value) => {
            setNewPassword(value);
            setErrors((previous) => ({ ...previous, newPassword: undefined }));
          }}
        />
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          value={confirmPassword}
          error={errors.confirm}
          visible={visibleFields.confirm}
          onToggleVisibility={() => setVisibleFields((previous) => ({ ...previous, confirm: !previous.confirm }))}
          onChange={(value) => {
            setConfirmPassword(value);
            setErrors((previous) => ({ ...previous, confirm: undefined }));
          }}
        />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" className="min-h-11 w-full sm:w-auto" disabled={changePassword.isPending} onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" className="min-h-11 w-full sm:w-auto" isLoading={changePassword.isPending}>
                  Update password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
