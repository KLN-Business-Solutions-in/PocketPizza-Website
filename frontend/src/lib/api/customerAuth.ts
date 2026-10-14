"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api/client";

// Temporary local customer-auth types: the frozen shared contract currently
// defines admin auth only.
export type CustomerPublic = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
};

export type CustomerPreferences = {
  whatsappOrderUpdates: boolean;
  whatsappStatusUpdates: boolean;
  theme: "system";
};

export type CustomerSignupRequest = {
  phone: string;
  name: string;
  password: string;
  email?: string;
};

export type CustomerLoginRequest = {
  phone: string;
  password: string;
};

type CustomerSessionResponse = {
  customer: CustomerPublic;
  preferences: CustomerPreferences;
};

type CustomerAuthResponse = {
  customer: CustomerPublic;
};

const CUSTOMER_SESSION_KEY = ["customer", "session"] as const;

type CustomerSessionResult =
  | { loggedIn: true; customer: CustomerPublic }
  | { loggedIn: false };

async function fetchCustomerSession(): Promise<CustomerSessionResult> {
  try {
    const session = await apiFetch<CustomerSessionResponse>("/auth/customer/me");
    return {
      loggedIn: true,
      customer: session.customer,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { loggedIn: false };
    }
    throw error;
  }
}

async function refetchCustomerSession(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
  if (!queryClient.getQueryState(CUSTOMER_SESSION_KEY)) {
    await queryClient.fetchQuery({
      queryKey: CUSTOMER_SESSION_KEY,
      queryFn: fetchCustomerSession,
      staleTime: 0,
      retry: false,
    });
    return;
  }
  await queryClient.refetchQueries(
    { queryKey: CUSTOMER_SESSION_KEY, exact: true, type: "all" },
    { throwOnError: true },
  );
}

export function useCustomerSession() {
  return useQuery({
    queryKey: CUSTOMER_SESSION_KEY,
    queryFn: fetchCustomerSession,
    staleTime: 5_000,
    retry: false,
  });
}

export function useCustomerLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CustomerLoginRequest) =>
      apiFetch<CustomerAuthResponse>("/auth/customer/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => refetchCustomerSession(queryClient),
  });
}

export function useCustomerSignup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CustomerSignupRequest) =>
      apiFetch<CustomerAuthResponse>("/auth/customer/signup", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => refetchCustomerSession(queryClient),
  });
}

export function useCustomerLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean }>("/auth/customer/logout", { method: "POST" }),
    onSuccess: async () => refetchCustomerSession(queryClient),
  });
}
