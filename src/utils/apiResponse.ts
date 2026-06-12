import { Response } from "express";

export class ApiResponse {
  static success(res: Response, statusCode: number, message: string, data: unknown = null) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static error(res: Response, statusCode: number, message: string, errors: unknown = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  }
}
