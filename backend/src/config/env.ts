import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ISSUER: z.string().default('pokket-pizza'),
  JWT_AUDIENCE: z.string().default('pokket-pizza-admin'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  COOKIE_DOMAIN: z.string().optional().default(''),
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN is required'),
  WHATSAPP_BSP_URL: z.string().optional().default(''),
  WHATSAPP_API_KEY: z.string().optional().default(''),
  WHATSAPP_SENDER_ID: z.string().optional().default(''),
  WHATSAPP_CUSTOMER_TEMPLATE: z.string().default('order_confirmation'),
  WHATSAPP_SHOP_TEMPLATE: z.string().default('new_order_alert'),
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

    console.error(`\n Invalid environment variables:\n${message}\n`);
    process.exit(1);
  }

  return result.data;
}

export const env = Object.freeze(loadEnv());
