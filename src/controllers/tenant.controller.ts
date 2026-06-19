import { Request, Response, NextFunction } from "express";
import { tenantService } from "../services/tenant.service";
import { ApiResponse } from "../utils/apiResponse";
import { ITenant } from "../models/tenant.model";
import { env } from "../config/env";

// dbUri is a secret connection string — never echo it back in API responses,
// even to an authenticated admin caller. (select: false on the schema also
// hides it from normal queries, but a freshly-created doc still has it in
// memory, so we strip it explicitly here too.)
const sanitizeTenant = (tenant: ITenant) => ({
  tenantId: tenant.tenantId,
  name: tenant.name,
  status: tenant.status,
  createdAt: tenant.createdAt,
  updatedAt: tenant.updatedAt,
});

// Onboarding payload for the developer integrating against this new tenant.
// No secrets here — just what they need to start calling the API.
const buildDeveloperInfo = (tenant: ITenant) => {
  const baseUrl = `http://localhost:${env.port}/api`;
  const header = `X-Tenant-Id: ${tenant.tenantId}`;

  return {
    tenantId: tenant.tenantId,
    header: { "X-Tenant-Id": tenant.tenantId },
    baseUrl,
    curlExamples: {
      register: `curl -X POST ${baseUrl}/auth/register \\
  -H "Content-Type: application/json" \\
  -H "${header}" \\
  -d '{"email":"user@example.com","password":"Str0ngP@ss!","name":"Jane Doe"}'`,

      login: `curl -X POST ${baseUrl}/auth/login \\
  -H "Content-Type: application/json" \\
  -H "${header}" \\
  -d '{"email":"user@example.com","password":"Str0ngP@ss!"}'`,

      refresh: `curl -X POST ${baseUrl}/auth/refresh \\
  -H "Content-Type: application/json" \\
  -H "${header}" \\
  -d '{"refreshToken":"<refresh_token_from_login>"}'`,

      me: `curl -X GET ${baseUrl}/auth/me \\
  -H "${header}" \\
  -H "Authorization: Bearer <access_token_from_login>"`,
    },
  };
};

export const tenantController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenant = await tenantService.create(req.body);
      return ApiResponse.success(res, 201, "Tenant created successfully", {
        tenant: sanitizeTenant(tenant),
        developerInfo: buildDeveloperInfo(tenant),
      });
    } catch (error) {
      next(error);
    }
  },

  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const tenants = await tenantService.list();
      return ApiResponse.success(res, 200, "Tenants fetched successfully", tenants.map(sanitizeTenant));
    } catch (error) {
      next(error);
    }
  },

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const tenant = await tenantService.getById(req.params.tenantId);
      return ApiResponse.success(res, 200, "Tenant fetched successfully", sanitizeTenant(tenant));
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenant = await tenantService.update(req.params.tenantId, req.body);
      return ApiResponse.success(res, 200, "Tenant updated successfully", sanitizeTenant(tenant));
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await tenantService.remove(req.params.tenantId);
      return ApiResponse.success(res, 200, "Tenant deleted successfully");
    } catch (error) {
      next(error);
    }
  },
};
