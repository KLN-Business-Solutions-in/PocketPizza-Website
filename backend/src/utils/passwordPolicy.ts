import { ValidationError } from './errors';

const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  'admin123',
  'iloveyou',
  'letmein1',
  'password',
  'password1',
  'password123',
  'pizzapizza',
  'pokketpizza',
  'pocketpizza',
  'qwerty123',
  'welcome1',
]);

export function assertStrongPassword(password: string, userInputs: string[]): void {
  const lower = password.toLowerCase();
  const condensed = lower.replace(/\s+/g, '');
  const inputs = userInputs
    .map((value) => value.toLowerCase().replace(/\s+/g, ''))
    .filter((value) => value.length >= 4);

  const tooGuessable =
    COMMON_PASSWORDS.has(lower) ||
    /^\d{8,}$/.test(password) ||
    /^(.)\1{7,}$/.test(password) ||
    inputs.some((value) => condensed.includes(value) || value.includes(condensed));

  if (tooGuessable) {
    throw new ValidationError('Password is too guessable, choose a stronger one', [
      'Avoid common passwords, repeated characters, or your name, phone, or email.',
    ]);
  }
}
