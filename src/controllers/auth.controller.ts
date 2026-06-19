import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenant) throw ApiError.badRequest("Tenant not resolved");
      const result = await authService.register(req.tenant.connection, req.tenant.id, req.body);
      return ApiResponse.success(res, 201, "User registered successfully", result);
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenant) throw ApiError.badRequest("Tenant not resolved");
      const result = await authService.login(req.tenant.connection, req.body);
      return ApiResponse.success(res, 200, "Login successful", result);
    } catch (error) {
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenant) throw ApiError.badRequest("Tenant not resolved");
      const { refreshToken } = req.body;
      const result = await authService.refresh(req.tenant.connection, refreshToken);
      return ApiResponse.success(res, 200, "Token refreshed successfully", result);
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenant) throw ApiError.badRequest("Tenant not resolved");
      const { refreshToken } = req.body;
      await authService.logout(req.tenant.connection, refreshToken);
      return ApiResponse.success(res, 200, "Logged out successfully");
    } catch (error) {
      next(error);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw ApiError.unauthorized();
      if (!req.tenant) throw ApiError.badRequest("Tenant not resolved");
      const profile = await authService.getProfile(req.tenant.connection, req.user.userId);
      return ApiResponse.success(res, 200, "Profile fetched successfully", profile);
    } catch (error) {
      next(error);
    }
  },
};
