import express, { Router, type NextFunction, type Request, type Response } from 'express';
import twilio from 'twilio';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { sendError } from '../../utils/response';
import { ah } from '../../utils/async-handler';
import { twilioStatusCallbackController } from './notification.controller';

export const twilioWebhookRouter = Router();

// Twilio posts application/x-www-form-urlencoded — parse at the route because
// the app-wide parser only handles JSON.
twilioWebhookRouter.use('/twilio-status', express.urlencoded({ extended: false }));

/**
 * Twilio webhook security — X-Twilio-Signature validation.
 *
 * Twilio signs each callback with HMAC-SHA1 over the full public callback URL
 * plus the alphabetically-sorted POST parameters, keyed by the auth token.
 * This middleware recomputes the signature with the official SDK
 * (`twilio.validateRequest`, a timing-safe comparison) and rejects anything
 * unsigned or wrongly signed with 403 before a handler runs.
 *
 * Requirements:
 *  - TWILIO_AUTH_TOKEN must be set (503 otherwise — nothing can be verified);
 *  - the app must sit behind TLS so `req.protocol` reconstructs the same
 *    https:// URL Twilio signed (`trust proxy` is already enabled);
 *  - Twilio's "Status Callback URL" must be configured as
 *    https://<public-host>/api/webhooks/twilio-status.
 *
 * SDK alternative: twilio.validateExpressRequest(req, env.TWILIO_AUTH_TOKEN).
 */
function validateTwilioSignature(req: Request, res: Response, next: NextFunction): void {
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
  const params = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<
    string,
    string
  >;

  if (!twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, params)) {
    logger.warn({ url }, 'twilio webhook signature mismatch — rejected');
    sendError(res, 'WEBHOOK_SIGNATURE_INVALID', 'Invalid Twilio signature', 403);
    return;
  }

  next();
}

twilioWebhookRouter.post('/twilio-status', validateTwilioSignature, ah(twilioStatusCallbackController));
