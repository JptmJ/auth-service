import mongoose, { Connection } from "mongoose";
import { Tenant } from "../models/tenant.model";
import { env } from "./env";

interface CachedTenant {
  dbUri: string;
  status: "active" | "suspended";
  fetchedAt: number;
}

interface CachedConnection {
  connection: Connection;
  lastUsedAt: number;
}

// Tiny in-memory cache so every single request doesn't have to hit the
// master DB just to find out which database to talk to.
const tenantRegistryCache = new Map<string, CachedTenant>();

// One live mongoose Connection per tenant, reused across requests.
const connectionCache = new Map<string, CachedConnection>();

export class TenantNotFoundError extends Error {}
export class TenantSuspendedError extends Error {}

const lookupTenant = async (tenantId: string): Promise<CachedTenant> => {
  const cached = tenantRegistryCache.get(tenantId);
  const isFresh = cached && Date.now() - cached.fetchedAt < env.tenantCacheTtlMs;

  if (isFresh) {
    return cached as CachedTenant;
  }

  const tenantDoc = await Tenant.findOne({ tenantId }).select("+dbUri");

  if (!tenantDoc) {
    throw new TenantNotFoundError(`No tenant registered for "${tenantId}"`);
  }

  const entry: CachedTenant = {
    dbUri: tenantDoc.dbUri,
    status: tenantDoc.status,
    fetchedAt: Date.now(),
  };

  tenantRegistryCache.set(tenantId, entry);
  return entry;
};

// Closes the least-recently-used connection once we're over the configured
// limit, so a growing client list doesn't exhaust DB connection limits.
const evictLeastRecentlyUsedIfNeeded = () => {
  if (connectionCache.size <= env.maxTenantConnections) return;

  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  for (const [key, value] of connectionCache.entries()) {
    if (value.lastUsedAt < oldestTime) {
      oldestTime = value.lastUsedAt;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    const evicted = connectionCache.get(oldestKey);
    connectionCache.delete(oldestKey);
    evicted?.connection.close().catch(() => undefined);
  }
};

/**
 * Returns a ready-to-use mongoose Connection for the given tenant, opening
 * one (and caching it) if this is the first request for that tenant since
 * boot. Throws TenantNotFoundError / TenantSuspendedError if appropriate —
 * callers (the tenant middleware) translate those into HTTP responses.
 */
export const getTenantConnection = async (tenantId: string): Promise<Connection> => {
  const tenant = await lookupTenant(tenantId);

  if (tenant.status === "suspended") {
    throw new TenantSuspendedError(`Tenant "${tenantId}" is suspended`);
  }

  const existing = connectionCache.get(tenantId);
  if (existing) {
    existing.lastUsedAt = Date.now();
    return existing.connection;
  }

  const connection = await mongoose.createConnection(tenant.dbUri).asPromise();

  connectionCache.set(tenantId, { connection, lastUsedAt: Date.now() });
  evictLeastRecentlyUsedIfNeeded();

  return connection;
};

// Call after admin updates/deletes a tenant so stale cached entries
// (an old dbUri, or a connection to a deleted tenant) don't linger.
export const invalidateTenantCache = async (tenantId: string): Promise<void> => {
  tenantRegistryCache.delete(tenantId);

  const cached = connectionCache.get(tenantId);
  if (cached) {
    connectionCache.delete(tenantId);
    await cached.connection.close().catch(() => undefined);
  }
};

// Used on graceful shutdown so the process doesn't hang on open sockets.
export const closeAllTenantConnections = async (): Promise<void> => {
  const closers = Array.from(connectionCache.values()).map((c) =>
    c.connection.close().catch(() => undefined)
  );
  connectionCache.clear();
  tenantRegistryCache.clear();
  await Promise.all(closers);
};
