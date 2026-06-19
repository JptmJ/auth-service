import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("4000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // The "control-plane" database: stores the tenant registry (which client
  // maps to which database). This is the ONLY database this service connects
  // to at boot. Every other database (one per client project) is connected
  // to lazily, on demand, based on what's stored here.
  MASTER_MONGO_URI: z.string().min(1, "MASTER_MONGO_URI is required"),

  // Shared secret(s) used to sign/verify JWTs for ALL tenants. Tenant
  // isolation is enforced by routing to separate databases, not by secret,
  // so one secret pair is fine. See README for the per-tenant-secret option.
  JWT_ACCESS_SECRET: z.string().min(10, "JWT_ACCESS_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(10, "JWT_REFRESH_SECRET is required"),
  ACCESS_TOKEN_EXPIRY: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRY: z.string().default("30d"),
  ALLOWED_ORIGINS: z.string().default("*"),

  // Protects the /api/admin/tenants endpoints used to onboard new client
  // projects/databases. Treat this like a root password.
  ADMIN_API_KEY: z.string().min(10, "ADMIN_API_KEY is required"),

  // How many client database connections to keep open at once. Oldest/least
  // recently used connections are closed automatically once this is exceeded.
  MAX_TENANT_CONNECTIONS: z.string().default("50"),

  // How long (ms) a tenant's registry entry (its db connection string) is
  // cached in memory before re-checking the master database for changes.
  TENANT_CACHE_TTL_MS: z.string().default("60000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  port: parseInt(parsed.data.PORT, 10),
  nodeEnv: parsed.data.NODE_ENV,
  masterMongoUri: parsed.data.MASTER_MONGO_URI,
  jwtAccessSecret: parsed.data.JWT_ACCESS_SECRET,
  jwtRefreshSecret: parsed.data.JWT_REFRESH_SECRET,
  accessTokenExpiry: parsed.data.ACCESS_TOKEN_EXPIRY,
  refreshTokenExpiry: parsed.data.REFRESH_TOKEN_EXPIRY,
  allowedOrigins: parsed.data.ALLOWED_ORIGINS.split(",").map((o) => o.trim()),
  adminApiKey: parsed.data.ADMIN_API_KEY,
  maxTenantConnections: parseInt(parsed.data.MAX_TENANT_CONNECTIONS, 10),
  tenantCacheTtlMs: parseInt(parsed.data.TENANT_CACHE_TTL_MS, 10),
};
