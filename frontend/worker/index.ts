import handler from "vinext/server/fetch-handler";

interface Env {
  API: Fetcher;
  [key: string]: unknown;
}

const globalWithEnv = globalThis as typeof globalThis & { __CF_ENV__?: Env };

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
    // Expose bindings to route handlers without importing cloudflare:workers,
    // which does not exist under the plain Next.js dev/build runtime.
    globalWithEnv.__CF_ENV__ = env;
    return handler.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
