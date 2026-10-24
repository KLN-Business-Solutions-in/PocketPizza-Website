"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, ErrorState, Skeleton } from "@/components/ui/LayoutPrimitives";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/ToastProvider";
import {
  apiErrorMessage,
  useCancelDeletion,
  useCustomerProfile,
  useRequestDeletion,
  useUpdatePreferences,
} from "@/lib/api/customer";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  const requestDeletion = useRequestDeletion();
  const cancelDeletion = useCancelDeletion();
  const toast = useToast();

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

  const { customer, preferences: prefs } = profile.data;
  const deletionPending = Boolean(customer.deletionRequestedAt);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 md:py-10">
      <h1 className="font-heading text-h2 font-bold text-charcoal">Settings</h1>
      <p className="mt-1 text-body text-bodySecondary">
        Manage your preferences, appearance, and account deletion.
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
                  onSuccess: () => toast.push("Deletion request cancelled.", "success"),
                  onError: (error) =>
                    toast.push(
                      apiErrorMessage(error, "Couldn't cancel the request."),
                      "error"
                    ),
                })
              }
            >
              Cancel deletion request
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
                        "Account deletion requested. You can cancel it from this page.",
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
