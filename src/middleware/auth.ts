import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { verifyAccessToken, TokenPayload } from "../utils/jwt";

// Extend Express Request type to include the authenticated user payload
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw ApiError.unauthorized("No token provided");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    // Defense in depth: even though the JWT secret is shared across
    // tenants, a token issued for tenant A must never be usable against
    // tenant B's database. If a tenant was already resolved (X-Tenant-Id
    // header present), confirm it matches the token's own appId.
    if (req.tenant && decoded.appId !== req.tenant.id) {
      throw ApiError.unauthorized("Token does not belong to this tenant");
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    next(ApiError.unauthorized("Invalid or expired token"));
  }
};

// Optional: restrict route to specific roles, e.g. authorize("admin")
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }

    next();
  };
};
