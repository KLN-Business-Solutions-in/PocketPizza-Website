"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

/** Temporary local type until GET /customer/me is added to the contract. */
export type CustomerAddress = {
  id: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  pincode: string;
};

type CustomerProfileResponse = { addresses: CustomerAddress[] };
const CUSTOMER_SESSION_KEY = ["customer", "session"] as const;

export function useCustomerAddresses(enabled = true) {
  return useQuery({
    queryKey: ["customer", "profile", "addresses"],
    queryFn: () => apiFetch<CustomerProfileResponse>("/customer/me"),
    enabled,
    retry: false,
  });
}

export function useUpdateCustomerName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string }) =>
      apiFetch<unknown>("/customer/me", {
        method: "PATCH",
        body: JSON.stringify({ name: body.name }),
      }),
    onSuccess: async () => {
      await queryClient.refetchQueries(
        { queryKey: CUSTOMER_SESSION_KEY, exact: true, type: "all" },
        { throwOnError: true },
      );
    },
  });
}
