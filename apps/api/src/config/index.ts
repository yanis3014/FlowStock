import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

const envCandidates = [
  resolve(process.cwd(), '../../.env'),
  resolve(process.cwd(), '.env'),
  resolve(__dirname, '../../../../.env'),
];

const envTestCandidates = [
  resolve(process.cwd(), '../../.env.test'),
  resolve(process.cwd(), '.env.test'),
  resolve(__dirname, '../../../../.env.test'),
];

for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    dotenvConfig({ path: envPath });
    break;
  }
}

if (process.env.NODE_ENV === 'test') {
  for (const envTestPath of envTestCandidates) {
    if (existsSync(envTestPath)) {
      dotenvConfig({ path: envTestPath, override: true });
      break;
    }
  }
}

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(65535))
    .default(3000),

  DATABASE_URL: z.string().url().optional(),
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.string().transform(Number).default(5432),
  POSTGRES_USER: z.string().default('bmad'),
  POSTGRES_PASSWORD: z.string().default('bmad'),
  POSTGRES_DB: z.string().default('bmad_stock_agent'),

  JWT_SECRET: z.string().default('fallback-secret-change-in-production-min-32-chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_EMAIL_VERIFICATION_EXPIRES_IN: z.string().default('24h'),
  JWT_PASSWORD_RESET_EXPIRES_IN: z.string().default('1h'),

  ML_SERVICE_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().optional(),

  GCP_PROJECT_ID: z.string().optional(),
  GCP_REGION: z.string().default('europe-west1'),

  APP_VERSION: z.string().default('0.1.0'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  /** Story 2.5: minutes without any POS event before marking sync as degraded (default 15) */
  POS_DEGRADED_SILENCE_MINUTES: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 15))
    .pipe(z.number().min(1).max(1440)),
  /** Story 2.5: consecutive webhook failures before marking degraded (default 5) */
  POS_DEGRADED_FAILURE_THRESHOLD: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 5))
    .pipe(z.number().min(1).max(100)),

  RUN_MIGRATIONS_ON_STARTUP: z
    .string()
    .optional()
    .default('true')
    .transform((val) => val !== 'false'),
});

export type Config = z.infer<typeof configSchema>;

let config: Config;

try {
  config = configSchema.parse(process.env) as Config;
} catch (error) {
  if (error instanceof z.ZodError) {
    // eslint-disable-next-line no-console
    console.error('❌ Configuration validation failed:');
    error.issues.forEach((err: z.ZodIssue) => {
      // eslint-disable-next-line no-console
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

if (config.NODE_ENV === 'production') {
  if (!config.DATABASE_URL && !config.POSTGRES_PASSWORD) {
    // eslint-disable-next-line no-console
    console.error('❌ DATABASE_URL or POSTGRES_PASSWORD must be set in production');
    process.exit(1);
  }
  if (config.JWT_SECRET.includes('fallback') || config.JWT_SECRET.includes('change')) {
    // eslint-disable-next-line no-console
    console.error('❌ JWT_SECRET must be changed in production');
    process.exit(1);
  }
  if (config.JWT_SECRET.length < 32) {
    // eslint-disable-next-line no-console
    console.error('❌ JWT_SECRET must be at least 32 characters in production');
    process.exit(1);
  }
}

export { config };

export function getDatabaseUrl(): string {
  if (config.DATABASE_URL) return config.DATABASE_URL;
  return `postgresql://${config.POSTGRES_USER}:${config.POSTGRES_PASSWORD}@${config.POSTGRES_HOST}:${config.POSTGRES_PORT}/${config.POSTGRES_DB}`;
}
