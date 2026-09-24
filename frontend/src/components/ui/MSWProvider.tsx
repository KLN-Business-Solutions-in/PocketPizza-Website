"use client";

import { createContext, useContext, useEffect, useState } from "react";

const MSWReadyContext = createContext(true);

let mockWorkerStartPromise: Promise<void> | null = null;

function startMockWorker(): Promise<void> {
  if (!mockWorkerStartPromise) {
    mockWorkerStartPromise = import("../../mocks/browser")
      .then(({ worker }) =>
        worker.start({
          onUnhandledRequest: "bypass",
          serviceWorker: {
            url: "/mockServiceWorker.js",
          },
        })
      )
      .then(() => undefined)
      .catch((error) => {
        mockWorkerStartPromise = null;
        throw error;
      });
  }
  return mockWorkerStartPromise;
}

async function unregisterMockWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    mockWorkerStartPromise = null;
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) =>
        [
          registration.active?.scriptURL,
          registration.waiting?.scriptURL,
          registration.installing?.scriptURL,
        ].some((scriptUrl) => scriptUrl?.endsWith("/mockServiceWorker.js"))
      )
      .map((registration) => registration.unregister())
  );
  mockWorkerStartPromise = null;
}

/** Returns whether the local mock worker is ready for queries to start. */
export function useMockReady() {
  return useContext(MSWReadyContext);
}

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const mocksEnabled = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
  const [mswReady, setMswReady] = useState(false);

  useEffect(() => {
    const initMSW = async () => {
      if (mocksEnabled && typeof window !== "undefined") {
        try {
          await startMockWorker();
          console.log("[MSW] Mocking enabled.");
          if (!navigator.serviceWorker.controller) {
            console.warn(
              "[MSW] Service worker registered but not controlling this page yet. Refresh once (F5) to activate interception."
            );
          }
        } catch (error) {
          console.error("[MSW] Failed to start:", error);
        } finally {
          // Let queries run even if worker startup failed so the page can show
          // its normal error state rather than remaining blank indefinitely.
          setMswReady(true);
        }
      } else {
        // A worker registered during mock mode can outlive an env toggle.
        // Remove only MSW's worker so live requests are not intercepted.
        void unregisterMockWorker()
          .catch((error) => {
            console.warn("[MSW] Failed to unregister the previous mock worker:", error);
          })
          .finally(() => setMswReady(true));
      }
    };

    void initMSW();
  }, [mocksEnabled]);

  return <MSWReadyContext.Provider value={mswReady}>{children}</MSWReadyContext.Provider>;
}
