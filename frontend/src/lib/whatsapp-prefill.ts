/**
 * Cross-component prefill for the floating WhatsApp action.
 *
 * The FAB lives in the (customer) layout, so it cannot receive props from
 * pages. Pages that have an order in view push a message here; the FAB
 * subscribes with useSyncExternalStore. Navigating away (or unmounting)
 * clears it, so the generic fallback text is restored.
 */

let snapshot: string | null = null;
const listeners = new Set<() => void>();

export function getWhatsAppPrefill(): string | null {
  return snapshot;
}

export function subscribeWhatsAppPrefill(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setWhatsAppPrefill(text: string | null): void {
  if (text === snapshot) return;
  snapshot = text;
  listeners.forEach((listener) => listener());
}
