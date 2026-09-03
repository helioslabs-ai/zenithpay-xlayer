import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Base mainnet is the default execution network. X Layer remains optional
  // for the legacy adapter during migration.
  BASE_RPC_URL: z.string().url().default("https://mainnet.base.org"),
  X402_FACILITATOR_URL: z.string().url().optional(),

  // Privy server wallet integration
  PRIVY_APP_ID: z.string().min(1).optional(),
  PRIVY_APP_SECRET: z.string().min(1).optional(),
  PRIVY_AUTHORIZATION_PRIVATE_KEY: z.string().min(1).optional(),

  // Legacy X Layer RPC
  XLAYER_RPC_URL: z.string().url().default("https://rpc.xlayer.tech"),

  // OKX OnchainOS
  OKX_API_KEY: z.string().min(1).optional(),
  OKX_SECRET_KEY: z.string().min(1).optional(),
  OKX_PASSPHRASE: z.string().min(1).optional(),
  OKX_PROJECT_ID: z.string().optional(),

  // Contract — must be set to deployed address
  SPEND_POLICY_ADDRESS: z
    .string()
    .regex(
      /^0x[a-fA-F0-9]{40}$/,
      "SPEND_POLICY_ADDRESS must be a valid EVM address",
    ),

  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),

  // Auth — must be at least 32 chars (64 hex chars from openssl rand -hex 32)
  ZENITHPAY_API_KEY_SECRET: z.string().min(32),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error(
      "❌ Invalid environment variables:",
      result.error.flatten().fieldErrors,
    );
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
export type Env = z.infer<typeof envSchema>;
