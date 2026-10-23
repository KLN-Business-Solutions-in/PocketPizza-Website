import { AuthError, NotFoundError, ValidationError } from '../../utils/errors';
import { hashPassword, verifyPassword } from '../../utils/password';
import { assertStrongPassword } from '../../utils/passwordPolicy';
import { toCustomerPreferences, type CustomerPreferences } from '../auth/auth.types';
import {
  countAddresses,
  createAddressRow,
  findAddressRow,
  findCustomerCredential,
  findCustomerProfile,
  listAddressRows,
  removeAddressRow,
  setCustomerDeletionRequest,
  updateAddressRow,
  updateCustomerPassword,
  updateCustomerProfile,
  type AddressRow,
} from './customer.repository';
import type {
  ChangePasswordInput,
  CreateAddressInput,
  PreferencesUpdateInput,
  UpdateAddressInput,
  UpdateProfileInput,
} from './customer.validation';

const MAX_SAVED_ADDRESSES = 10;

export type AddressResponse = {
  id: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  pincode: string;
};

export type CustomerAccountResponse = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  deletionRequestedAt: string | null;
};

export type CustomerProfileResponse = {
  customer: CustomerAccountResponse;
  preferences: CustomerPreferences;
  addresses: AddressResponse[];
};

export type CustomerAccountPayload = {
  customer: CustomerAccountResponse;
  preferences: CustomerPreferences;
};

function toAddress(row: AddressRow): AddressResponse {
  return {
    id: row.id,
    line1: row.line1,
    line2: row.line2,
    landmark: row.landmark,
    city: row.city,
    pincode: row.pincode,
  };
}

type ProfileRow = NonNullable<Awaited<ReturnType<typeof findCustomerProfile>>>;

function toAccount(row: ProfileRow): CustomerAccountResponse {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    deletionRequestedAt: row.deletionRequestedAt?.toISOString() ?? null,
  };
}

async function loadProfile(customerId: string): Promise<ProfileRow> {
  const row = await findCustomerProfile(customerId);
  // token subject no longer resolves (account removed between sessions)
  if (!row) throw new AuthError();
  return row;
}

export async function getProfile(customerId: string): Promise<CustomerProfileResponse> {
  const [row, addresses] = await Promise.all([
    findCustomerProfile(customerId),
    listAddressRows(customerId),
  ]);
  if (!row) throw new AuthError();
  return {
    customer: toAccount(row),
    preferences: toCustomerPreferences(row),
    addresses: addresses.map(toAddress),
  };
}

export async function patchProfile(
  customerId: string,
  body: UpdateProfileInput,
): Promise<CustomerAccountPayload> {
  const hasName = body.name !== undefined;
  const hasPreferences =
    body.preferences !== undefined && Object.keys(body.preferences).length > 0;
  if (!hasName && !hasPreferences) {
    throw new ValidationError('Validation failed', [
      'body: at least one of name or preferences is required',
    ]);
  }

  const row = await updateCustomerProfile(customerId, {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.preferences ?? {}),
  });
  return {
    customer: toAccount(row),
    preferences: toCustomerPreferences(row),
  };
}

export async function listAddresses(customerId: string): Promise<{ addresses: AddressResponse[] }> {
  const rows = await listAddressRows(customerId);
  return { addresses: rows.map(toAddress) };
}

// Dedicated /me/preferences endpoints (issue #45); PATCH /me accepts the same
// preference keys, these are the explicit read/write surface the issue names.
export async function getPreferences(
  customerId: string,
): Promise<{ preferences: CustomerPreferences }> {
  const row = await loadProfile(customerId);
  return { preferences: toCustomerPreferences(row) };
}

export async function patchPreferences(
  customerId: string,
  body: PreferencesUpdateInput,
): Promise<{ preferences: CustomerPreferences }> {
  if (Object.keys(body).length === 0) {
    throw new ValidationError('Validation failed', ['body: at least one preference is required']);
  }
  const row = await updateCustomerProfile(customerId, body);
  return { preferences: toCustomerPreferences(row) };
}

export async function createAddress(
  customerId: string,
  input: CreateAddressInput,
): Promise<{ address: AddressResponse }> {
  const count = await countAddresses(customerId);
  if (count >= MAX_SAVED_ADDRESSES) {
    throw new ValidationError('Too many saved addresses', [
      `body: at most ${MAX_SAVED_ADDRESSES} saved addresses per account`,
    ]);
  }
  const row = await createAddressRow(customerId, input);
  return { address: toAddress(row) };
}

export async function patchAddress(
  customerId: string,
  id: string,
  body: UpdateAddressInput,
): Promise<{ address: AddressResponse }> {
  if (Object.keys(body).length === 0) {
    throw new ValidationError('Validation failed', ['body: at least one address field is required']);
  }
  const count = await updateAddressRow(customerId, id, body);
  if (count === 0) throw new NotFoundError('Address');
  const row = await findAddressRow(customerId, id);
  if (!row) throw new NotFoundError('Address');
  return { address: toAddress(row) };
}

export async function deleteAddress(customerId: string, id: string): Promise<{ ok: true }> {
  const count = await removeAddressRow(customerId, id);
  if (count === 0) throw new NotFoundError('Address');
  return { ok: true };
}

export async function changePassword(
  customerId: string,
  body: ChangePasswordInput,
): Promise<{ ok: true }> {
  const row = await findCustomerCredential(customerId);
  if (!row) throw new AuthError();

  const currentOk =
    row.passwordHash !== null && (await verifyPassword(row.passwordHash, body.currentPassword));
  if (!currentOk) {
    throw new ValidationError('Current password is incorrect', [
      'currentPassword: does not match the account password',
    ]);
  }
  if (body.newPassword === body.currentPassword) {
    throw new ValidationError('Validation failed', [
      'newPassword: must differ from the current password',
    ]);
  }

  assertStrongPassword(body.newPassword, [row.name, row.phone]);
  await updateCustomerPassword(customerId, await hashPassword(body.newPassword));
  return { ok: true };
}

// Order and Address FKs to Customer are ON DELETE RESTRICT, so a customer with
// history can never be hard-deleted here — deletion works as a recorded request
// (issue #38 account section) that operations can action out of band.
export async function requestDeletion(
  customerId: string,
): Promise<{ deletionRequestedAt: string }> {
  const at = new Date();
  await setCustomerDeletionRequest(customerId, at);
  return { deletionRequestedAt: at.toISOString() };
}

export async function cancelDeletion(customerId: string): Promise<{ deletionRequestedAt: null }> {
  await setCustomerDeletionRequest(customerId, null);
  return { deletionRequestedAt: null };
}
