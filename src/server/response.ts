import { Response } from "express";

export interface StandardSuccessResponse<T = any> {
  success: true;
  message?: string;
  data: T;
  // Backward compatibility fields
  [key: string]: any;
}

export interface StandardErrorResponse {
  success: false;
  message: string;
  code: string;
  error: string; // Backward compatibility
  // Additional contextual properties
  [key: string]: any;
}

/**
 * Sends a standardized JSON success response:
 * { success: true, message, data, ...extra }
 */
export function sendSuccess<T = any>(
  res: Response,
  data: T,
  message: string = "Operation completed successfully.",
  statusCode: number = 200,
  extra: Record<string, any> = {}
): void {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(statusCode).json({
    success: true,
    message,
    data,
    ...extra,
    ...(data && typeof data === "object" && !Array.isArray(data) ? data : {}),
  });
}

/**
 * Sends a standardized JSON error response:
 * { success: false, message, code, error: message, ...extra }
 */
export function sendError(
  res: Response,
  message: string,
  statusCode: number = 400,
  code?: string,
  extra: Record<string, any> = {}
): void {
  const finalCode = code || (statusCode >= 500 ? "SERVER_ERROR" : `ERR_${statusCode}`);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(statusCode).json({
    success: false,
    message,
    code: finalCode,
    error: message, // Preserved for legacy frontend consumers
    ...extra,
  });
}
