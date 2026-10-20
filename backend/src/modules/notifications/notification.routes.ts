import { Hono } from 'hono';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { sendError } from '../../utils/response';
import { wrap, wrapMiddleware } from '../../http/express-adapter';
import { twilioStatusCallbackController } from './notification.controller';

export const twilioWebhookRouter = new Hono();

/**
 * Twilio webhook security — X-Twilio-Signature validation.
 *
 * Twilio signs each callback with HMAC-SHA1 over the full public callback URL
 * plus the alphabetically-sorted POST parameters, keyed by the auth token.
 * This middleware recomputes the signature and rejects anything unsigned or
 * wrongly signed with 403 before a handler runs.
 *
 * Requirements:
 *  - TWILIO_AUTH_TOKEN must be set (503 otherwise — nothing can be verified);
 *  - the app must sit behind TLS so the URL scheme/value matches what Twilio
 *    signed;
 *  - Twilio's "Status Callback URL" must be configured as
 *    https://<public-host>/api/webhooks/twilio-status.
 */
function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = createHmac('sha1', authToken).update(data, 'utf8').digest('base64');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(signature, 'utf8');
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

const verifySignature = wrapMiddleware((req, res, next) => {
  if (!env.TWILIO_AUTH_TOKEN) {
    sendError(res, 'WEBHOOK_NOT_CONFIGURED', 'Twilio auth token not configured', 503);
    return;
  }

  const signature = req.get('X-Twilio-Signature');
  if (!signature) {
    sendError(res, 'WEBHOOK_SIGNATURE_MISSING', 'Missing X-Twilio-Signature header', 401);
    return;
  }

  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const rawParams = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<
    string,
    unknown
  >;
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === 'string') params[key] = value;
  }

  if (!validateTwilioSignature(env.TWILIO_AUTH_TOKEN, signature, url, params)) {
    logger.warn({ url }, 'twilio webhook signature mismatch — rejected');
    sendError(res, 'WEBHOOK_SIGNATURE_INVALID', 'Invalid Twilio signature', 403);
    return;
  }

  next();
});

twilioWebhookRouter.post(
  '/twilio-status',
  verifySignature,
  wrap(twilioStatusCallbackController),
);
