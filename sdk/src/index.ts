import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

export interface AuthClientConfig {
  /** Base URL of the common auth service, e.g. https://auth.yourcompany.com/api */
  baseUrl: string;
  /** This project's tenant id, as registered via /api/admin/tenants */
  tenantId: string;
}

export interface TokenPayload {
  userId: string;
  appId: string;
  roles: string[];
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

const request = async <T>(
  config: AuthClientConfig,
  path: string,
  init: RequestInit
): Promise<T> => {
  const res = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-Id": config.tenantId,
      ...(init.headers || {}),
    },
  });

  const body = (await res.json()) as ApiEnvelope<T>;

  if (!res.ok || !body.success) {
    throw new Error(body.message || `Auth service request failed (${res.status})`);
  }

  return body.data;
};

/**
 * Creates a client every new project can use the same way: register, login,
 * refresh, logout against the common auth service, all pre-wired with this
 * project's tenant id.
 */
export const createAuthClient = (config: AuthClientConfig) => ({
  register: (input: { name: string; email: string; password: string }) =>
    request<{ user: unknown; tokens: { accessToken: string; refreshToken: string } }>(
      config,
      "/auth/register",
      { method: "POST", body: JSON.stringify(input) }
    ),

  login: (input: { email: string; password: string }) =>
    request<{ user: unknown; tokens: { accessToken: string; refreshToken: string } }>(
      config,
      "/auth/login",
      { method: "POST", body: JSON.stringify(input) }
    ),

  refresh: (refreshToken: string) =>
    request<{ user: unknown; tokens: { accessToken: string; refreshToken: string } }>(
      config,
      "/auth/refresh",
      { method: "POST", body: JSON.stringify({ refreshToken }) }
    ),

  logout: (refreshToken: string) =>
    request<null>(config, "/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),

  me: (accessToken: string) =>
    request<unknown>(config, "/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Express middleware for THIS project's own routes (not the auth service).
 * Verifies the access token locally — no network call to the auth service —
 * using the SAME JWT_ACCESS_SECRET configured there. This is the
 * recommended way for every new project to protect its own endpoints.
 */
export const verifyAccessToken = (jwtAccessSecret: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, jwtAccessSecret) as TokenPayload;
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
  };
};
