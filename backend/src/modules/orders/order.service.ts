import type {
  CreateOrderRequest,
  CreateOrderResponse,
  InvoiceResponse,
  OrderStatusResponse,
  QuoteRequest,
  QuoteResponse,
} from '@pokket-pizza/contract/contract';
import { randomBytes } from 'crypto';
import { AppError, ConflictError, NotFoundError, ValidationError } from '../../utils/errors';
import { normalizeIndianPhone } from '../../utils/phone';
import { toFixed2 } from '../../utils/decimal';
import {
  expireOldIdempotencyKeys,
  findOrderByIdempotencyKey,
  findOrderByToken,
  findQuoteItems,
  findRestaurantPricing,
  placeOrder,
} from './order.repository';
import { computeQuote } from './pricing.service';
import type { ResolvedQuoteLine } from './order.types';

type RestaurantPricing = NonNullable<Awaited<ReturnType<typeof findRestaurantPricing>>>;
type OrderRow = NonNullable<Awaited<ReturnType<typeof findOrderByToken>>>;

export async function resolveCart(input: {
  orderType: QuoteRequest['orderType'];
  items: QuoteRequest['items'];
}): Promise<{ resolved: ResolvedQuoteLine[]; restaurant: RestaurantPricing }> {
  const restaurant = await findRestaurantPricing();
  if (!restaurant) {
    throw new NotFoundError('Restaurant');
  }

  const ids = [...new Set(input.items.map((line) => line.menuItemId))];
  const rows = await findQuoteItems(ids, restaurant.id);
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

  return { resolved, restaurant };
}

export async function quoteOrder(input: QuoteRequest): Promise<QuoteResponse> {
  const { resolved, restaurant } = await resolveCart(input);
  return computeQuote(resolved, input.orderType, restaurant.deliveryFee);
}

function isP2002(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002';
}

function p2002Target(e: unknown): string {
  const t = (e as { meta?: { target?: unknown } }).meta?.target;
  return Array.isArray(t) ? t.join('.') : String(t ?? '');
}

function orderInvalid(details: string[]): AppError {
  return new AppError('ORDER_INVALID', 'Order rejected', 400, details);
}

type IdempotencyExisting = NonNullable<Awaited<ReturnType<typeof findOrderByIdempotencyKey>>>;

// The key alone is not a credential: it must resolve to *this* requester's
// identical request, otherwise respond with a data-free 409.
// Fingerprint covers variant + add-ons, not just menuItemId, so a replay with
// the same key but a different configuration is rejected instead of silently
// returning the original order.
function fingerprintLine(
  i: { menuItemId: string; variantSnapshot: string | null; quantity: number },
  addOns: unknown,
): string {
  const labels = Array.isArray(addOns)
    ? addOns
        .map((a) => String((a as { label?: unknown })?.label ?? ''))
        .sort()
        .join('+')
    : '';
  return `${i.menuItemId}:${i.variantSnapshot ?? ''}:${labels}:${i.quantity}`;
}

function idempotencyMatches(
  existing: IdempotencyExisting,
  expected: {
    phone: string;
    orderType: string;
    items: { menuItemId: string; variantSnapshot: string | null; quantity: number; addOnSnapshot: unknown }[];
  },
): boolean {
  if (existing.customer.phone !== expected.phone) return false;
  if (String(existing.orderType) !== expected.orderType) return false;
  const a = existing.items.map((i) => fingerprintLine(i, i.addOnsSnapshot)).sort();
  const b = expected.items.map((i) => fingerprintLine(i, i.addOnSnapshot)).sort();
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function toCreateResponse(o: {
  orderNumber: string;
  publicToken: string;
  status: string;
  subtotal: unknown;
  deliveryFee: unknown;
  tax: unknown;
  total: unknown;
}): CreateOrderResponse {
  return {
    orderNumber: o.orderNumber,
    publicToken: o.publicToken,
    status: o.status as CreateOrderResponse['status'],
    subtotal: toFixed2(String(o.subtotal)),
    deliveryFee: toFixed2(String(o.deliveryFee)),
    tax: toFixed2(String(o.tax)),
    total: toFixed2(String(o.total)),
  };
}

export async function createOrder(input: CreateOrderRequest): Promise<{
  data: CreateOrderResponse;
  created: boolean;
}> {
  let phone: string;
  try {
    phone = normalizeIndianPhone(input.customer.phone);
  } catch {
    throw new ValidationError('Validation failed', [
      'customer.phone: not a valid Indian mobile number',
    ]);
  }

  const name = input.customer.name.trim();
  if (!name) {
    throw orderInvalid(['customer.name: required']);
  }

  if (input.orderType === 'DELIVERY' && !input.address) {
    throw orderInvalid(['address: required for DELIVERY orders']);
  }
  if (
    input.orderType === 'DELIVERY' &&
    input.address &&
    !/^\d{6}$/.test(input.address.pincode.trim())
  ) {
    throw orderInvalid(['address.pincode: must be a 6-digit Indian PIN code']);
  }

  let resolved: ResolvedQuoteLine[];
  let restaurant: RestaurantPricing;
  try {
    ({ resolved, restaurant } = await resolveCart(input));
  } catch (err) {
    if (err instanceof ValidationError) throw orderInvalid(err.details ?? []);
    throw err;
  }

  const quote = computeQuote(resolved, input.orderType, restaurant.deliveryFee);

  // Decimal(10,2) columns: reject oversized orders with a clean 400, not a DB overflow 500
  const MAX_ORDER_VALUE = 9999999999.99;
  if (Number(quote.subtotal) > MAX_ORDER_VALUE || Number(quote.total) > MAX_ORDER_VALUE) {
    throw orderInvalid(['items: order value exceeds the allowed maximum']);
  }

  const addressJson =
    input.orderType === 'DELIVERY' && input.address ? JSON.stringify(input.address) : null;

  const idempotencyKey = input.idempotencyKey ?? null;
  if (idempotencyKey) {
    await expireOldIdempotencyKeys();
    const existing = await findOrderByIdempotencyKey(idempotencyKey);
    if (existing) {
      if (!idempotencyMatches(existing, { phone, orderType: input.orderType, items: quote.items })) {
        throw new ConflictError('Request could not be processed');
      }
      return { data: toCreateResponse(existing), created: false };
    }
  }

  const orderItems = quote.items.map((i) => ({
    menuItemId: i.menuItemId,
    nameSnapshot: i.nameSnapshot,
    variantSnapshot: i.variantSnapshot,
    addOnSnapshot: i.addOnSnapshot,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    lineTotal: i.lineTotal,
  }));

  const publicToken = randomBytes(24).toString('hex');

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const order = await placeOrder({
        publicToken,
        idempotencyKey,
        restaurantId: restaurant.id,
        customer: { name, phone },
        orderType: input.orderType,
        deliveryAddress: addressJson,
        notes: input.notes ?? null,
        subtotal: quote.subtotal,
        deliveryFee: quote.deliveryFee,
        tax: quote.tax,
        total: quote.total,
        items: orderItems,
      });
      return { data: toCreateResponse(order), created: true };
    } catch (err) {
      if (isP2002(err) && p2002Target(err).includes('idempotencyKey')) {
        const existing = idempotencyKey ? await findOrderByIdempotencyKey(idempotencyKey) : null;
        if (existing) {
          if (
            !idempotencyMatches(existing, { phone, orderType: input.orderType, items: quote.items })
          ) {
            throw new ConflictError('Request could not be processed');
          }
          return { data: toCreateResponse(existing), created: false };
        }
        continue;
      }
      if (isP2002(err)) continue;
      throw err;
    }
  }
  throw new AppError('CONFLICT', 'Could not allocate order number, please retry', 409);
}

function mapItems(row: OrderRow) {
  return row.items.map((it) => ({
    menuItemId: it.menuItemId,
    nameSnapshot: it.nameSnapshot,
    variantSnapshot: it.variantSnapshot,
    addOnSnapshot: Array.isArray(it.addOnsSnapshot)
      ? (it.addOnsSnapshot as { label: string; price: string }[])
      : [],
    quantity: it.quantity,
    unitPrice: toFixed2(it.unitPrice.toString()),
    lineTotal: toFixed2(it.lineTotal.toString()),
  }));
}

function parseStoredAddress(raw: string | null): InvoiceResponse['address'] {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (typeof p.line1 !== 'string' || typeof p.city !== 'string' || typeof p.pincode !== 'string') {
      return null;
    }
    return {
      line1: p.line1,
      line2: typeof p.line2 === 'string' ? p.line2 : null,
      landmark: typeof p.landmark === 'string' ? p.landmark : null,
      city: p.city,
      pincode: p.pincode,
    };
  } catch {
    return null;
  }
}

export async function getOrderStatus(publicToken: string): Promise<OrderStatusResponse> {
  const row = await findOrderByToken(publicToken);
  if (!row) throw new NotFoundError('Order');
  return {
    orderNumber: row.orderNumber,
    publicToken: row.publicToken,
    status: row.status,
    orderType: row.orderType,
    items: mapItems(row),
    subtotal: toFixed2(row.subtotal.toString()),
    deliveryFee: toFixed2(row.deliveryFee.toString()),
    tax: toFixed2(row.tax.toString()),
    total: toFixed2(row.total.toString()),
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getInvoice(publicToken: string): Promise<InvoiceResponse> {
  const row = await findOrderByToken(publicToken);
  if (!row) throw new NotFoundError('Order');
  return {
    orderNumber: row.orderNumber,
    status: row.status,
    orderType: row.orderType,
    customer: { name: row.customer.name, phone: row.customer.phone },
    address: parseStoredAddress(row.deliveryAddress),
    items: mapItems(row).map((i) => ({
      menuItemId: i.menuItemId,
      nameSnapshot: i.nameSnapshot,
      variantSnapshot: i.variantSnapshot,
      addOnSnapshot: i.addOnSnapshot,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    })),
    subtotal: toFixed2(row.subtotal.toString()),
    deliveryFee: toFixed2(row.deliveryFee.toString()),
    tax: toFixed2(row.tax.toString()),
    total: toFixed2(row.total.toString()),
    paymentMethod: row.paymentMethod,
    createdAt: row.createdAt.toISOString(),
  };
}
