import type {
  OrderType,
  QuoteItem,
  QuoteResponse,
} from '@pokket-pizza/contract/contract';
import { Prisma } from '../../generated/prisma/client';
import { toFixed2 } from '../../utils/decimal';
import type { ResolvedQuoteLine } from './order.types';

export function computeQuote(
  lines: ResolvedQuoteLine[],
  orderType: OrderType,
  deliveryFee: Prisma.Decimal,
): QuoteResponse {
  const priced = lines.map((line) => {
    let unit = line.basePrice;
    if (line.variant) {
      unit = unit.plus(line.variant.priceDelta);
    }
    for (const addOn of line.addOns) {
      unit = unit.plus(addOn.price);
    }
    const lineTotal = unit.times(line.input.quantity);
    return { line, unit, lineTotal };
  });

  const subtotal = priced.reduce(
    (acc, p) => acc.plus(p.lineTotal),
    new Prisma.Decimal(0),
  );
  const fee = orderType === 'DELIVERY' ? deliveryFee : new Prisma.Decimal(0);
  const tax = new Prisma.Decimal(0);
  const total = subtotal.plus(fee).plus(tax);

  const items: QuoteItem[] = priced.map(({ line, unit, lineTotal }) => ({
    menuItemId: line.input.menuItemId,
    nameSnapshot: line.name,
    variantSnapshot: line.variant ? line.variant.label : null,
    addOnSnapshot: line.addOns.map((addOn) => ({
      label: addOn.label,
      price: toFixed2(addOn.price.toString()),
    })),
    quantity: line.input.quantity,
    unitPrice: toFixed2(unit.toString()),
    lineTotal: toFixed2(lineTotal.toString()),
  }));

  return {
    items,
    subtotal: toFixed2(subtotal.toString()),
    deliveryFee: toFixed2(fee.toString()),
    tax: toFixed2(tax.toString()),
    total: toFixed2(total.toString()),
  };
}
