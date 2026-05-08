import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const booleanFromEnv = z
  .union([z.boolean(), z.string()])
  .transform((value, ctx) => {
    if (typeof value === "boolean") {
      return value;
    }

    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "off", ""].includes(normalized)) {
      return false;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Expected a boolean-like environment value.",
    });

    return z.NEVER;
  });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_NAME: z.string().min(1).default("Bookverse"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(16),
  SESSION_TABLE_NAME: z.string().min(1).default("sessions"),
  SESSION_COOKIE_NAME: z.string().min(1).default("bookverse.sid"),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 7),
  ENABLE_SECURE_COOKIES: booleanFromEnv.default(false),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
  ANALYTICS_RELAY_ENABLED: booleanFromEnv.default(false),
  GA4_MEASUREMENT_ID: z.string().optional().default(""),
  GA4_API_SECRET: z.string().optional().default(""),
  BANK_TRANSFER_BANK_NAME: z.string().min(1).default("Vietcombank"),
  BANK_TRANSFER_ACCOUNT_NUMBER: z.string().min(1).default("1234567890"),
  BANK_TRANSFER_ACCOUNT_NAME: z.string().min(1).default("BOOKVERSE JSC"),
  BANK_TRANSFER_NOTE_PREFIX: z.string().min(1).default("BOOKVERSE"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${message}`);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
