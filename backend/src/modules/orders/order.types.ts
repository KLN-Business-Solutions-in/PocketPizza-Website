import type { QuoteRequest } from '@pokket-pizza/contract/contract';
import type { Prisma } from '../../generated/prisma/client';

export type QuoteLineInput = QuoteRequest['items'][number];

export type ResolvedQuoteLine = {
  input: QuoteLineInput;
  name: string;
  basePrice: Prisma.Decimal;
  variant: { label: string; priceDelta: Prisma.Decimal } | null;
  addOns: { label: string; price: Prisma.Decimal }[];
};
