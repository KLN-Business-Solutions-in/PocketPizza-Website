import type { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { sendError, sendSuccess } from '../../utils/response';
import { findByProviderMessageId, markDeliveryStatus } from './notification.repository';

/**
 * Twilio Message Status Callback payload (form-encoded).
 * https://www.twilio.com/docs/messaging/api/message-resource#status-callback
 */
const statusCallbackSchema = z.object({
  MessageSid: z.string().min(1),
  MessageStatus: z.string().min(1),
  ErrorCode: z.string().optional(),
  ErrorMessage: z.string().optional(),
});

/**
 * POST /api/webhooks/twilio-status
 * Extracts MessageSid, MessageStatus and ErrorMessage (on failure), logs them,
 * and folds the delivery outcome back into the Notification row for the
 * customer-facing status API. Signature validation happens before this runs.
 */
export async function twilioStatusCallbackController(req: Request, res: Response): Promise<void> {
  const parsed = statusCallbackSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    sendError(res, 'VALIDATION_ERROR', 'MessageSid and MessageStatus are required', 400);
    return;
  }

  const { MessageSid, MessageStatus, ErrorMessage } = parsed.data;
  const failed = MessageStatus === 'failed' || MessageStatus === 'undelivered';

  if (failed) {
    logger.warn({ MessageSid, MessageStatus, ErrorCode: req.body?.ErrorCode, ErrorMessage }, 'whatsapp message failed');
  } else {
    logger.info({ MessageSid, MessageStatus }, 'whatsapp message status update');
  }

  try {
    const row = await findByProviderMessageId(MessageSid);
    if (!row) {
      // Ack anyway: unknown Sids are not an error (external tests, replays),
      // and a 4xx would only trigger Twilio's retry loop.
      logger.info({ MessageSid }, 'no notification row matches MessageSid');
    } else {
      await markDeliveryStatus(
        row.id,
        failed ? 'failed' : MessageStatus,
        failed ? (ErrorMessage ?? 'provider reported failure') : null,
      );
    }
  } catch (err) {
    // DB write failed: surface 500 so Twilio retries the callback.
    logger.error({ err, MessageSid }, 'could not persist delivery status');
    sendError(res, 'INTERNAL_ERROR', 'Could not persist delivery status', 500);
    return;
  }

  sendSuccess(res, { received: true });
}
