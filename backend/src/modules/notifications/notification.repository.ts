import { getPrisma } from '../../config/database';

export const NOTIFICATION_CHANNEL_WHATSAPP = 'whatsapp';

export type CreateAttemptInput = {
  orderId: string;
  channel: string;
  template: string;
  destination: string;
  status: 'sent' | 'failed' | 'skipped';
  providerMessageId?: string | null;
  errorMessage?: string | null;
};

/** Idempotency guard: one logged attempt per (order, template). */
export async function findAttempt(orderId: string, template: string) {
  const prisma = await getPrisma();
  return prisma.notification.findFirst({
    where: { orderId, channel: NOTIFICATION_CHANNEL_WHATSAPP, template },
  });
}

/** Logs success AND failure alike — the write itself must never throw into dispatch. */
export async function createAttempt(input: CreateAttemptInput) {
  const prisma = await getPrisma();
  return prisma.notification.create({
    data: {
      orderId: input.orderId,
      channel: input.channel,
      template: input.template,
      destination: input.destination,
      status: input.status,
      providerMessageId: input.providerMessageId ?? null,
      errorMessage: input.errorMessage ?? null,
    },
  });
}

export async function findByProviderMessageId(providerMessageId: string) {
  const prisma = await getPrisma();
  return prisma.notification.findFirst({
    where: { providerMessageId, channel: NOTIFICATION_CHANNEL_WHATSAPP },
  });
}

export async function markDeliveryStatus(id: string, status: string, errorMessage: string | null) {
  const prisma = await getPrisma();
  return prisma.notification.update({
    where: { id },
    data: { status, errorMessage },
  });
}
