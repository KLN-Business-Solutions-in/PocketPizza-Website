import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const API_ORIGIN = process.env.API_ORIGIN || "http://localhost:4000";

const FORWARDED_REQUEST_HEADERS = ["content-type", "authorization", "cookie", "accept"];

interface ServiceBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

function getApiBinding(): ServiceBinding | undefined {
  return (
    globalThis as typeof globalThis & {
      __CF_ENV__?: { API?: ServiceBinding };
    }
  ).__CF_ENV__?.API;
}

async function fetchUpstream(target: URL, init: RequestInit): Promise<Response> {
  // Worker-to-Worker fetches on the same workers.dev zone are blocked (error
  // 1042), so whenever the API service binding exists we use it. Plain fetch
  // remains for local dev, where no binding is available.
  const binding = getApiBinding();
  if (binding) {
    return binding.fetch(target, init);
  }
  return fetch(target, init);
}

async function proxy(request: NextRequest): Promise<Response> {
  const url = new URL(request.url);
  const target = new URL(`${url.pathname}${url.search}`, API_ORIGIN);

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const clientIp =
    request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip");
  if (clientIp) headers.set("x-forwarded-for", clientIp);
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", url.protocol.replace(":", ""));

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: "manual",
  };
  if (hasBody) init.duplex = "half";

  const upstream = await fetchUpstream(target, init);

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");

  // A Headers copy collapses multiple Set-Cookie values into one; re-append
  // them individually so the browser receives every cookie (access + refresh).
  const setCookies = upstream.headers.getSetCookie();
  responseHeaders.delete("set-cookie");

  const response = new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
  for (const cookie of setCookies) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
  proxy as HEAD,
  proxy as OPTIONS,
};
