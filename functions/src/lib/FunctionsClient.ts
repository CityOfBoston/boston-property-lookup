import {onCall, onRequest, Request,
  HttpsError, CallableRequest} from "firebase-functions/v2/https";
import {Response} from "express";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {StandardResponse} from "../types";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 500; // 30 requests per minute

/**
 * Simple rate limiting function
 * @param {string} identifier - The identifier to rate limit (IP, user ID, etc.)
 * @return {boolean} - Whether the request should be allowed
 */
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    // First request or window expired
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false; // Rate limit exceeded
  }

  // Increment count
  record.count++;
  return true;
}

/**
 * Clean up old rate limit records periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW);

/**
 * Utility function to create callable functions with consistent response structure.
 * All callable functions will return a standardized response with status, message, and data.
 * @param {any} handler - The handler function for the callable.
 * @return {functions.https.onCall}
 */
export function createCallable(
  handler: (data: any, context: CallableRequest) => Promise<StandardResponse<any>>) {
  return onCall(async (request) => {
    try {
      console.log("[CallableFunction] Function called with data:", request.data);

      // Rate limiting - use IP address or user ID as identifier
      const identifier = request.auth?.uid ||
                        request.rawRequest.headers["x-forwarded-for"] as string ||
                        request.rawRequest.connection.remoteAddress ||
                        "unknown";

      if (!checkRateLimit(identifier)) {
        throw new HttpsError("resource-exhausted", "Rate limit exceeded. Please try again later.");
      }

      const result = await handler(request.data, request);

      console.log("[CallableFunction] Function completed successfully");
      return result;
    } catch (error) {
      console.error("[CallableFunction] Error in callable function:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "An unexpected error occurred");
    }
  });
}

/**
 * Utility function to create HTTP trigger functions with
 * different access levels. Public endpoints are not protected
 * and can be accessed by anyone. Protected endpoints
 * require a valid API key while private endpoints require
 * both a valid API key and a valid IP address.
 * All HTTP functions will return a standardized response with status, message, and data.
 * @param {string} accessLevel - The access level of the function.
 * @param {any} handler
 * - The handler function for the function.
 * @param {boolean} hasBatchOperation
 * - Whether the function has a batch operation.
 * @return {functions.https.onRequest}
 */
export function createHttp(
  accessLevel: "public" | "internal" | "private" = "internal",
  handler: (request: Request, response: Response)
    => void | Promise<void>,
  hasBatchOperation = false) {
  return onRequest(
    hasBatchOperation ?
      {timeoutSeconds: 3600, memory: "1GiB"} :
      {timeoutSeconds: 300, memory: "512MiB"},
    async (req, res) => {
      try {
        console.log(`[HttpFunction] ${accessLevel} function called`);
        console.log(`[HttpFunction] Method: ${req.method}`);
        console.log("[HttpFunction] Headers:", req.headers);

        if (accessLevel === "internal" || accessLevel === "private") {
          await validateApiKey(req, res);
        }
        if (accessLevel === "private") {
          await validateIpAddress(req, res);
        }

        await handler(req, res);

        console.log("[HttpFunction] Function completed successfully");
      } catch (error) {
        console.error(`[HttpFunction] Error in ${accessLevel} function:`, error);

        // Ensure consistent error response structure
        const errorResponse: StandardResponse<null> = {
          status: "error",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
          data: null,
        };

        res.status(500).json(errorResponse);
      }
    });
}

/**
 * Helper function to create standardized success responses for HTTP functions.
 * @param {Response} res - The response object.
 * @param {T} data - The data to include in the response.
 * @param {string} message - The success message.
 * @param {number} statusCode - The HTTP status code (default: 200).
 */
export function sendSuccessResponse<T>(
  res: Response,
  data: T,
  message = "Operation completed successfully",
  statusCode = 200
) {
  const response: StandardResponse<T> = {
    status: "success",
    message,
    data,
  };

  res.status(statusCode).json(response);
}

/**
 * Helper function to create standardized error responses for HTTP functions.
 * @param {Response} res - The response object.
 * @param {string} message - The error message.
 * @param {number} statusCode - The HTTP status code (default: 500).
 * @param {T} data - Additional error data (optional).
 */
export function sendErrorResponse<T = null>(
  res: Response,
  message = "An error occurred",
  statusCode = 500,
  data: T = null as T
) {
  const response: StandardResponse<T> = {
    status: "error",
    message,
    data,
  };

  res.status(statusCode).json(response);
}

/**
 * Helper function to create standardized success responses for callable functions.
 * @param {T} data - The data to include in the response.
 * @param {string} message - The success message.
 * @return {StandardResponse<T>}
 */
export function createSuccessResponse<T>(
  data: T,
  message = "Operation completed successfully"
): StandardResponse<T> {
  return {
    status: "success",
    message,
    data,
  };
}

/**
 * Helper function to create standardized error responses for callable functions.
 * @param {string} message - The error message.
 * @param {T} data - Additional error data (optional).
 * @return {StandardResponse<T>}
 */
export function createErrorResponse<T = null>(
  message = "An error occurred",
  data: T = null as T
): StandardResponse<T> {
  return {
    status: "error",
    message,
    data,
  };
}

const secretManagerClient = new SecretManagerServiceClient();

/**
 * Given a firebase cloud function request, it will check the
 * request IP
 * address and determine if it is allowed.
 * @param {Request} request - The request object.
 * @param {Response} res - The response object.
 */
const validateIpAddress = async (request: Request, res: Response) => {
  const clientIp = request.headers["x-forwarded-for"] ||
        request.connection.remoteAddress || "";
  const [version] = await secretManagerClient.accessSecretVersion({
    name: `projects/${process.env.GCP_PROJECT_ID}` +
    "/secrets/IP_WHITELIST/versions/latest",
  });
  const allowedIPs = version.payload?.data?.toString().
    split(",").map((ip: string) => ip.trim());
  if (!allowedIPs?.some((allowedIp: string) =>
    (clientIp as string).startsWith(allowedIp.split("/")[0]))) {
    sendErrorResponse(res, "Access denied: IP not allowed", 403);
    return;
  }
};

/**
 * Given a firebase cloud function request, it will check the provided
 * API key and determine if it is valid by fetching the API key from
 * GCP Secret Manager.`
 * @param {Request} request - The request object.
 * @param {Response} res - The response object.
 */
const validateApiKey = async (request: Request, res: Response) => {
  const authHeader = request.headers.authorization || "";
  const token = authHeader.split(" ")[1];
  const [version] = await secretManagerClient.accessSecretVersion({
    name: `projects/${process.env.GCP_PROJECT_ID}`+
    "/secrets/EXTERNAL_API_TOKEN/versions/latest",
  });
  const externalAPIToken = version.payload?.data?.toString();
  if (token !== externalAPIToken) {
    sendErrorResponse(res, "Unauthorized API key", 401);
    return;
  }
};
