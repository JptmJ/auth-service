import { Request, Response, NextFunction } from "express";
import { Connection } from "mongoose";
import { ApiError } from "../utils/apiError";
import {
  getTenantConnection,
  TenantNotFoundError,
  TenantSuspendedError,
} from "../config/dbManager";

export interface TenantContext {
  id: string;
  connection: Connection;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

const TENANT_HEADER = "x-tenant-id";

/**
 * Every project that talks to this common auth service identifies itself
 * with the `X-Tenant-Id` header (a static value that project's own backend
 * holds in its own config — it's the project's "account name" on this
 * service). This middleware turns that header into a real, ready-to-query
 * database connection on `req.tenant`.
 */
export const resolveTenant = async (req: Request, _res: Response, next: NextFunction) => {
  const tenantId = req.header(TENANT_HEADER);

  if (!tenantId) {
    return next(ApiError.badRequest(`Missing required "${TENANT_HEADER}" header`));
  }

  try {
    const connection = await getTenantConnection(tenantId.toLowerCase().trim());
    req.tenant = { id: tenantId.toLowerCase().trim(), connection };
    next();
  } catch (error) {
    if (error instanceof TenantNotFoundError) {
      return next(ApiError.notFound(`Unknown tenant "${tenantId}"`));
    }
    if (error instanceof TenantSuspendedError) {
      return next(ApiError.forbidden(`Tenant "${tenantId}" is suspended`));
    }
    next(error);
  }
};
