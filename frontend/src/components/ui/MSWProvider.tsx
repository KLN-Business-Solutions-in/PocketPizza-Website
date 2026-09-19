"use client";

import { useEffect, useState } from "react";

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [mswReady, setMswReady] = useState(false);

  useEffect(() => {
    const initMSW = async () => {
      if (process.env.NEXT_PUBLIC_USE_MOCKS === "true" && typeof window !== "undefined") {
        try {
          const { worker } = await import("../../mocks/browser");
          await worker.start({
            onUnhandledRequest: "bypass",
            serviceWorker: {
              url: "/mockServiceWorker.js",
            },
          });
          console.log("[MSW] Mocking enabled.");
          if (!navigator.serviceWorker.controller) {
            console.warn("[MSW] Service worker registered but not controlling this page yet. Refresh once (F5) to activate interception.");
          }
          setMswReady(true);
        } catch (error) {
          console.error("[MSW] Failed to start:", error);
          setMswReady(true);
        }
      } else {
        setMswReady(true);
      }
    };
    initMSW();
  }, []);

  if (!mswReady) return null;
  return <>{children}</>;
}