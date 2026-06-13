import { z } from 'zod';

/**
 * Zod validation foundation. These schemas are shared building blocks used by
 * route validators across the app. Feature-specific schemas (projects,
 * articles, jobs, ...) are added in later phases and should reuse these.
 */

/** Trimmed, non-empty string with a max length. */
export const nonEmptyString = (max = 255) => z.string().trim().min(1).max(max);

/** Optional trimmed string. */
export const optionalString = (max = 1000) => z.string().trim().max(max).optional();

/** Positive integer id (accepts numeric strings from route params). */
export const idSchema = z.coerce.number().int().positive();

/** Email address. */
export const emailSchema = z.string().trim().toLowerCase().email().max(255);

/** Strong-ish password: min 8 chars. */
export const passwordSchema = z.string().min(8).max(200);

/** A URL that must be http(s). */
export const httpUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), { message: 'Must be an http(s) URL' });

/**
 * First-run setup payload. Used by the setup wizard (Phase 2) to create the
 * admin account and initial AI provider settings. Declared here as part of the
 * validation foundation.
 */
export const setupSchema = z.object({
  username: nonEmptyString(50),
  email: emailSchema,
  password: passwordSchema,
  aiProviderName: nonEmptyString(50),
  aiBaseUrl: httpUrlSchema,
  aiModel: nonEmptyString(100),
  aiApiKey: nonEmptyString(500),
  defaultLanguage: nonEmptyString(50),
  defaultTone: nonEmptyString(50),
});

export type SetupInput = z.infer<typeof setupSchema>;

/** Login payload. */
export const loginSchema = z.object({
  username: nonEmptyString(255),
  password: z.string().min(1).max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Settings update payload. All fields optional (partial update). `ai_api_key`
 * is special: an empty/absent value means "keep the existing key".
 */
export const settingsUpdateSchema = z.object({
  ai_provider_name: optionalString(50),
  ai_base_url: z.string().trim().max(500).optional(),
  ai_model: optionalString(100),
  ai_api_key: z.string().max(500).optional(),
  max_tokens: z.coerce.number().int().min(256).max(64000).optional(),
  temperature: z.coerce.number().min(0).max(2).optional(),
  default_language: optionalString(50),
  default_tone: optionalString(50),
  rate_limit_ms: z.coerce.number().int().min(0).max(60000).optional(),
  concurrency: z.coerce.number().int().min(1).max(20).optional(),
});

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;

/** Optional unsaved AI config for the "test connection" endpoint. */
export const testConnectionSchema = z.object({
  ai_base_url: z.string().trim().max(500).optional(),
  ai_model: optionalString(100),
  ai_api_key: z.string().max(500).optional(),
});

export type TestConnectionInput = z.infer<typeof testConnectionSchema>;

/**
 * Validate `data` against `schema`, throwing a 400-tagged error with a safe,
 * human-readable message on failure.
 */
export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue?.path.join('.') ?? 'input';
    const err = new Error(`Invalid ${field}: ${issue?.message ?? 'validation failed'}`);
    (err as { status?: number }).status = 400;
    throw err;
  }
  return result.data;
}
