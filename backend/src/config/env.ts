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
  // Twilio WhatsApp (Content API). Empty values are allowed so the server can
  // boot without credentials — sends then fail cleanly and are logged, and the
  // status webhook reports WEBHOOK_NOT_CONFIGURED until AUTH_TOKEN is set.
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

    console.error(`\n Invalid environment variables:\n${message}\n`);
    process.exit(1);
  }

  return result.data;
}

export const env = Object.freeze(loadEnv());
