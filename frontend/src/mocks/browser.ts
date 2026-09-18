import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

if (typeof window !== "undefined") {
  console.log("[MSW] Worker created with handlers:", handlers.length);
}