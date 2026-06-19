import mongoose from "mongoose";
import { Tenant } from "../models/tenant.model";
import { getUserModel } from "../models/user.model";
import { getRefreshTokenModel } from "../models/token.model";
import { ApiError } from "../utils/apiError";
import { invalidateTenantCache } from "../config/dbManager";

interface CreateTenantInput {
  tenantId: string;
  name: string;
  dbUri: string;
}

interface UpdateTenantInput {
  name?: string;
  dbUri?: string;
  status?: "active" | "suspended";
}

/**
 * Pulls the database name out of a Mongo connection string's path segment.
 *
 *   mongodb+srv://user:pass@cluster.mongodb.net/courier_aggregator_db?x=1
 *                                               ^^^^^^^^^^^^^^^^^^^^^
 *
 * If this is empty, the driver silently defaults to a database called
 * "test" — which is why every tenant created with a bare URI (no path)
 * ends up colliding in the same shared "test" database instead of getting
 * its own. We treat a missing db name as a configuration error rather than
 * silently allowing it, since it defeats the entire point of per-tenant
 * databases.
 */
export const extractDbName = (uri: string): string | null => {
  try {
    // mongodb+srv:// and mongodb:// both parse fine with the URL class —
    // pathname will be "/dbName" or just "/" (or "") if no db was given.
    const { pathname } = new URL(uri);
    const dbName = pathname.replace(/^\//, "").trim();
    return dbName.length > 0 ? dbName : null;
  } catch {
    return null;
  }
};

/**
 * Opens a short-lived connection to a tenant's own database and forces
 * Mongoose to materialize its collections + indexes immediately (instead of
 * waiting for the first real write, e.g. the first /auth/register call).
 *
 * This connection is intentionally NOT the cached one from dbManager.ts —
 * dbManager's cache is for serving live requests. Provisioning happens once,
 * at tenant-creation time, so we open, use, and close our own connection
 * here rather than warming/polluting the request-serving cache.
 */
export const provisionTenantDatabase = async (dbUri: string): Promise<void> => {
  const connection = await mongoose.createConnection(dbUri).asPromise();

  try {
    const User = getUserModel(connection);
    const RefreshToken = getRefreshTokenModel(connection);

    // .init() builds indexes and is what actually makes Mongo create the
    // collection on the server, even with zero documents in it.
    await Promise.all([User.init(), RefreshToken.init()]);
  } finally {
    await connection.close().catch(() => undefined);
  }
};

export const tenantService = {
  async create(input: CreateTenantInput) {
    const existing = await Tenant.findOne({ tenantId: input.tenantId });
    if (existing) {
      throw ApiError.conflict(`Tenant "${input.tenantId}" already exists`);
    }

    const dbName = extractDbName(input.dbUri);
    if (!dbName) {
      throw ApiError.badRequest(
        "dbUri must include a database name in its path, e.g. " +
          '".../courier_aggregator_db?appName=..." — without one, Mongo ' +
          'silently defaults to a shared "test" database and tenants will ' +
          "collide with each other."
      );
    }

    // Verify the tenant's own database is actually reachable and provision
    // its collections/indexes BEFORE we register it. If this fails, we
    // throw and never write the registry doc — no half-created tenant that
    // points at a database that doesn't actually work.
    try {
      await provisionTenantDatabase(input.dbUri);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw ApiError.badRequest(`Could not connect to/provision dbUri: ${reason}`);
    }

    const tenant = await Tenant.create(input);
    return tenant;
  },

  async list() {
    return Tenant.find().sort({ createdAt: -1 });
  },

  async getById(tenantId: string) {
    const tenant = await Tenant.findOne({ tenantId });
    if (!tenant) {
      throw ApiError.notFound(`Tenant "${tenantId}" not found`);
    }
    return tenant;
  },

  async update(tenantId: string, input: UpdateTenantInput) {
    const tenant = await Tenant.findOneAndUpdate({ tenantId }, { $set: input }, { new: true });

    if (!tenant) {
      throw ApiError.notFound(`Tenant "${tenantId}" not found`);
    }

    // Force the next request for this tenant to pick up the change
    // (new dbUri, or newly suspended status) instead of using a stale cache.
    await invalidateTenantCache(tenantId);

    return tenant;
  },

  async remove(tenantId: string) {
    const tenant = await Tenant.findOneAndDelete({ tenantId });

    if (!tenant) {
      throw ApiError.notFound(`Tenant "${tenantId}" not found`);
    }

    await invalidateTenantCache(tenantId);
  },
};
