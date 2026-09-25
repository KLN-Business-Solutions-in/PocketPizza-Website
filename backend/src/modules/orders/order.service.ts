import type {
  QuoteRequest,
  QuoteResponse,
} from '@pokket-pizza/contract/contract';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { findQuoteItems, findRestaurantPricing } from './order.repository';
import { computeQuote } from './pricing.service';
import type { ResolvedQuoteLine } from './order.types';

export async function quoteOrder(input: QuoteRequest): Promise<QuoteResponse> {
  const ids = [...new Set(input.items.map((line) => line.menuItemId))];
  const rows = await findQuoteItems(ids);
  const byId = new Map(rows.map((row) => [row.id, row]));

  const details: string[] = [];
  const resolved: ResolvedQuoteLine[] = [];

  input.items.forEach((line, index) => {
    const item = byId.get(line.menuItemId);
    if (!item) {
      details.push(`items[${index}]: menuItemId not found`);
      return;
    }
    if (!item.isActive) {
      details.push(`items[${index}]: "${item.name}" is no longer available`);
      return;
    }

    let variant: ResolvedQuoteLine['variant'] = null;
    if (line.variantId !== undefined) {
      const match = item.variants.find((v) => v.id === line.variantId);
      if (!match) {
        details.push(`items[${index}]: invalid variant for "${item.name}"`);
        return;
      }
      variant = { label: match.label, priceDelta: match.priceDelta };
    }

    const addOns: ResolvedQuoteLine['addOns'] = [];
    let lineOk = true;
    for (const addOnId of line.addOnIds) {
      const match = item.addOns.find((addOn) => addOn.id === addOnId);
      if (!match) {
        details.push(
          `items[${index}]: invalid add-on "${addOnId}" for "${item.name}"`,
        );
        lineOk = false;
        continue;
      }
      addOns.push({ label: match.label, price: match.price });
    }
    if (!lineOk) return;

    resolved.push({
      input: line,
      name: item.name,
      basePrice: item.basePrice,
      variant,
      addOns,
    });
  });

  if (details.length > 0) {
    throw new ValidationError('Quote rejected', details);
  }

  const restaurant = await findRestaurantPricing();
  if (!restaurant) {
    throw new NotFoundError('Restaurant');
  }

  return computeQuote(resolved, input.orderType, restaurant.deliveryFee);
}
