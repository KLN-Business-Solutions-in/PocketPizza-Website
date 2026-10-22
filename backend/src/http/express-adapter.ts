import type { Context, MiddlewareHandler } from 'hono';
import type {
  NextFunction as ExpressNext,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { errorHandler, notFoundHandler } from '../middleware/error.middleware';

type CookieOptions = {
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none' | boolean;
};

type ResponseState = {
  status: number;
  headers: Headers;
  cookies: string[];
  body: string | null;
  ended: boolean;
};

type RequestBundle = {
  req: Record<string, unknown>;
  res: Record<string, unknown>;
  state: ResponseState;
};

export type ExpressStyleHandler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: ExpressNext,
) => unknown;

const requestIds = new WeakMap<Context, string>();
const bundles = new WeakMap<Context, RequestBundle>();

const MAX_BODY_BYTES = 100 * 1024;

export function getRequestId(c: Context): string {
  let id = requestIds.get(c);
  if (!id) {
    id = `req_${crypto.randomUUID().slice(0, 12)}`;
    requestIds.set(c, id);
  }
  return id;
}

function parserError(type: 'entity.parse.failed' | 'entity.too.large'): Error {
  const err = new Error(
    type === 'entity.too.large' ? 'request entity too large' : 'malformed JSON',
  ) as Error & { type: string };
  err.type = type;
  return err;
}

async function readBody(c: Context): Promise<unknown> {
  const method = c.req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return undefined;

  const length = Number(c.req.header('content-length') ?? '0');
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    throw parserError('entity.too.large');
  }

  const contentType = (c.req.header('content-type') ?? '').toLowerCase();
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    return c.req.parseBody();
  }
  if (contentType.includes('application/json') || contentType.includes('+json')) {
    const text = await c.req.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw parserError('entity.parse.failed');
    }
  }
  if (length > 0) return c.req.text();
  return undefined;
}

function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    if (!name) continue;
    const value = part.slice(index + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

function serializeCookie(name: string, value: string, opts: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(opts.maxAge / 1000)}`);
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  if (opts.sameSite) {
    const sameSite =
      typeof opts.sameSite === 'boolean'
        ? opts.sameSite
          ? 'Strict'
          : ''
        : opts.sameSite.charAt(0).toUpperCase() + opts.sameSite.slice(1);
    if (sameSite) parts.push(`SameSite=${sameSite}`);
  }
  return parts.join('; ');
}

async function makeRequest(c: Context): Promise<Record<string, unknown>> {
  const url = new URL(c.req.url);
  const forwardedFor = c.req.header('x-forwarded-for');
  const ip =
    c.req.header('cf-connecting-ip') ??
    (forwardedFor ? forwardedFor.split(',')[0]?.trim() : undefined) ??
    'unknown';

  const req: Record<string, unknown> = {
    id: getRequestId(c),
    method: c.req.method,
    url: `${url.pathname}${url.search}`,
    originalUrl: `${url.pathname}${url.search}`,
    path: url.pathname,
    protocol: url.protocol.replace(':', ''),
    ip,
    // resolved lazily: middleware prepares this request before the final
    // handler's route params are matched, so a snapshot would be empty
    get params() {
      return c.req.param();
    },
    query: c.req.query(),
    cookies: parseCookies(c.req.header('cookie')),
    get(name: string) {
      return c.req.header(name);
    },
    header(name: string) {
      return c.req.header(name);
    },
  };

  req.body = await readBody(c);
  return req;
}

function makeResponse(
  req: Record<string, unknown>,
  state: ResponseState,
): Record<string, unknown> {
  const res: Record<string, unknown> = {
    req,
    get statusCode() {
      return state.status;
    },
    set statusCode(value: number) {
      state.status = value;
    },
    status(code: number) {
      state.status = code;
      return res;
    },
    setHeader(name: string, value: string | number | readonly string[]) {
      if (Array.isArray(value)) {
        state.headers.delete(name);
        for (const item of value) state.headers.append(name, String(item));
      } else {
        state.headers.set(name, String(value));
      }
      return res;
    },
    getHeader(name: string) {
      return state.headers.get(name) ?? undefined;
    },
    json(payload: unknown) {
      state.body = JSON.stringify(payload);
      if (!state.headers.has('Content-Type')) {
        state.headers.set('Content-Type', 'application/json; charset=utf-8');
      }
      state.ended = true;
      return res;
    },
    cookie(name: string, value: string, opts?: CookieOptions) {
      state.cookies.push(serializeCookie(name, value, opts));
      return res;
    },
    clearCookie(name: string, opts?: CookieOptions) {
      state.cookies.push(
        serializeCookie(name, '', { ...opts, maxAge: undefined, expires: new Date(0) }),
      );
      return res;
    },
    end() {
      state.ended = true;
      return res;
    },
  };
  return res;
}

async function prepare(c: Context): Promise<RequestBundle> {
  const cached = bundles.get(c);
  if (cached) return cached;

  const req = await makeRequest(c);
  const state: ResponseState = {
    status: 200,
    headers: new Headers(),
    cookies: [],
    body: null,
    ended: false,
  };
  const res = makeResponse(req, state);
  const bundle = { req, res, state };
  bundles.set(c, bundle);
  return bundle;
}

function buildResponse(state: ResponseState): Response {
  const headers = new Headers(state.headers);
  for (const cookie of state.cookies) headers.append('Set-Cookie', cookie);
  return new Response(state.ended ? state.body : null, {
    status: state.status,
    headers,
  });
}

function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === 'string') return new Error(err);
  return new Error('Unknown error');
}

export function wrap(handler: ExpressStyleHandler): (c: Context) => Promise<Response> {
  return async (c) => {
    const { req, res, state } = await prepare(c);
    try {
      await handler(
        req as unknown as ExpressRequest,
        res as unknown as ExpressResponse,
        ((err?: unknown) => {
          if (err) throw err;
        }) as ExpressNext,
      );
    } catch (err) {
      errorHandler(
        toError(err),
        req as unknown as ExpressRequest,
        res as unknown as ExpressResponse,
        (() => undefined) as ExpressNext,
      );
    }
    return buildResponse(state);
  };
}

export function wrapMiddleware(middleware: ExpressStyleHandler): MiddlewareHandler {
  return async (c, next) => {
    const { req, res, state } = await prepare(c);
    let nextCalled = false;
    let downstream: Promise<void> | undefined;

    const expressNext = (err?: unknown): Promise<void> | undefined => {
      if (err) throw err;
      nextCalled = true;
      downstream = next();
      return downstream;
    };

    try {
      await middleware(
        req as unknown as ExpressRequest,
        res as unknown as ExpressResponse,
        expressNext as unknown as ExpressNext,
      );
    } catch (err) {
      errorHandler(
        toError(err),
        req as unknown as ExpressRequest,
        res as unknown as ExpressResponse,
        (() => undefined) as ExpressNext,
      );
      return buildResponse(state);
    }

    if (state.ended) return buildResponse(state);
    if (downstream) {
      await downstream;
      return;
    }
    if (nextCalled) return;
    state.status = 500;
    state.body = JSON.stringify({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Middleware did not continue the request' },
      requestId: String(req.id ?? ''),
    });
    state.headers.set('Content-Type', 'application/json; charset=utf-8');
    state.ended = true;
    return buildResponse(state);
  };
}

export async function handleNotFound(c: Context): Promise<Response> {
  const { req, res, state } = await prepare(c);
  notFoundHandler(req as unknown as ExpressRequest, res as unknown as ExpressResponse);
  return buildResponse(state);
}
