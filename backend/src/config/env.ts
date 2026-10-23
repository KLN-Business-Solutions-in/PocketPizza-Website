import { z } from 'zod';

const optionalShopCoordinate = (min: number, max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.coerce.number().min(min).max(max).optional(),
  );

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().optional().default(''),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ISSUER: z.string().default('pokket-pizza'),
  JWT_AUDIENCE: z.string().default('pokket-pizza-admin'),
  ACCESS_TOKEN_TTL: z.string().default('7d'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  COOKIE_DOMAIN: z.string().optional().default(''),
  CORS_ORIGIN: z.string().optional().default('http://localhost:3000'),
  SHOP_LATITUDE: optionalShopCoordinate(-90, 90),
  SHOP_LONGITUDE: optionalShopCoordinate(-180, 180),
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_WHATSAPP_NUMBER: z.string().optional().default(''),
  CUSTOMER_TEMPLATE_SID: z.string().optional().default(''),
  ADMIN_TEMPLATE_SID: z.string().optional().default(''),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

type EnvInput = z.infer<typeof envSchema>;

function loadEnv(): EnvInput {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const message = Object.entries(errors)
      .map(([key, val]) => `  ${key}: ${val?.join(', ')}`)
      .join('\n');

    throw new Error(`\n Invalid environment variables:\n${message}\n`);
  }

  return result.data;
}

export const env = Object.freeze(loadEnv());
