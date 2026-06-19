import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { env } from "../config/env";

const ADMIN_HEADER = "x-admin-key";

/**
 * Protects the /api/admin/tenants endpoints, which is where you onboard a
 * brand-new client project (and its dedicated database) onto this service.
 * This is intentionally simple (one shared secret). See README "Securing
 * the admin API in production" for hardening suggestions (IP allow-list,
 * VPN-only, a real admin user system, etc.) before exposing this publicly.
 */
export const requireAdminKey = (req: Request, _res: Response, next: NextFunction) => {
  const key = req.header(ADMIN_HEADER);

  if (!key || key !== env.adminApiKey) {
    return next(ApiError.unauthorized("Invalid or missing admin key"));
  }

  next();
};
