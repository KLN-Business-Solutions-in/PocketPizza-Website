import twilio from 'twilio';
import { env } from '../../config/env';
import type { WhatsAppSendResult } from './notification.types';

const SEND_TIMEOUT_MS = 8_000;
const MAX_ERROR_LENGTH = 300;

/**
 * E.164 (+919876543210) for Twilio. Accepts the shapes we already tolerate
 * elsewhere: bare 10-digit, 0-prefixed, 91-prefixed, +91-prefixed.
 * Throws on anything that is not a plausible phone number.
 */
export function formatE164(raw: string): string {
  let s = (raw ?? '').replace(/[^\d+]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (/^[6-9]\d{9}$/.test(s)) return `+91${s}`;
  if (/^91[6-9]\d{9}$/.test(s)) return `+${s}`;
  if (/^0[6-9]\d{9}$/.test(s)) return `+91${s.slice(1)}`;
  if (/^\d{7,15}$/.test(s)) return `+${s}`;
  throw new Error(`cannot format "${raw}" as E.164`);
}

/** Twilio WhatsApp addresses are "whatsapp:+<e164>" for both to and from. */
function whatsappAddress(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (trimmed.toLowerCase().startsWith('whatsapp:')) {
    return `whatsapp:${formatE164(trimmed.slice('whatsapp:'.length))}`;
  }
  return `whatsapp:${formatE164(trimmed)}`;
}

let client: twilio.Twilio | undefined;

function getTwilioClient(): twilio.Twilio | undefined {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) return undefined;
  if (!client) {
    client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

/** true when every credential the Content API needs is present. */
export function isTwilioConfigured(): boolean {
  return Boolean(
    env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_NUMBER,
  );
}

type TwilioLikeError = { status?: number; code?: number; message?: string };

function classifyError(err: unknown, label: string): WhatsAppSendResult {
  const e = (typeof err === 'object' && err !== null ? err : {}) as TwilioLikeError;
  const status = typeof e.status === 'number' ? e.status : undefined;
  // No HTTP status → transport-level failure (DNS/timeout/refused): transient.
  const retryable = status === undefined || status === 429 || status >= 500;
  const detail = [
    label,
    status !== undefined ? `HTTP ${status}` : 'network error',
    e.code !== undefined ? `(code ${e.code})` : '',
    e.message ?? 'send failed',
  ]
    .filter(Boolean)
    .join(' ');
  return { success: false, error: detail.slice(0, MAX_ERROR_LENGTH), retryable };
}

type TemplateSendInput = {
  label: string;
  contentSid: string;
  to: string;
  /**
   * Positional template variables keyed "1", "2", … exactly as numbered in
   * the approved Twilio Content template. Serialized with JSON.stringify —
   * the Content API requires contentVariables to be a JSON *string*.
   */
  contentVariables: Record<string, string>;
};

async function sendTemplateMessage(input: TemplateSendInput): Promise<WhatsAppSendResult> {
  try {
    if (!input.contentSid) {
      return {
        success: false,
        error: `${input.label}: template SID not configured`,
        retryable: false,
      };
    }
    const twilioClient = getTwilioClient();
    if (!twilioClient) {
      return {
        success: false,
        error: `${input.label}: Twilio credentials not configured`,
        retryable: false,
      };
    }

    const create = twilioClient.messages.create({
      to: whatsappAddress(input.to),
      from: whatsappAddress(env.TWILIO_WHATSAPP_NUMBER),
      contentSid: input.contentSid,
      contentVariables: JSON.stringify(input.contentVariables),
    });
    // If the timeout wins the race below, the real request still settles later;
    // attach a no-op catch so that late rejection is never "unhandled".
    create.catch(() => undefined);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`send timed out after ${SEND_TIMEOUT_MS}ms`)), SEND_TIMEOUT_MS).unref(),
    );
    const message = (await Promise.race([create, timeout])) as { sid: string };

    return { success: true, messageId: message.sid, retryable: false };
  } catch (err) {
    return classifyError(err, input.label);
  }
}

/**
 * Customer order confirmation — approved Content template `CUSTOMER_TEMPLATE_SID`.
 * Variable numbering must match the approved template:
 *   {{1}} = customer name, {{2}} = order number, {{3}} = total amount.
 */
export async function sendCustomerConfirmation(
  customerPhone: string,
  name: string,
  orderId: string,
  totalAmount: string,
): Promise<WhatsAppSendResult> {
  return sendTemplateMessage({
    label: 'customer_confirmation',
    contentSid: env.CUSTOMER_TEMPLATE_SID,
    to: customerPhone,
    contentVariables: { '1': name, '2': orderId, '3': totalAmount },
  });
}

/**
 * Shop new-order alert (KOT) — approved Content template `ADMIN_TEMPLATE_SID`.
 *   {{1}} = order number, {{2}} = items summary, {{3}} = delivery type.
 */
export async function sendAdminNotification(
  adminPhone: string,
  orderId: string,
  itemsSummary: string,
  deliveryType: string,
): Promise<WhatsAppSendResult> {
  return sendTemplateMessage({
    label: 'shop_kot',
    contentSid: env.ADMIN_TEMPLATE_SID,
    to: adminPhone,
    contentVariables: { '1': orderId, '2': itemsSummary, '3': deliveryType },
  });
}
