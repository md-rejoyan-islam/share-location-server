import express, { NextFunction, Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { HttpError } from "http-errors";
import { errorResponse, successResponse } from "../helper/response-handler";

const router = express.Router();

// home route
router.get("/", (_req: Request, res: Response) => {
  successResponse(res, {
    statusCode: 200,
    message: "Location Sharing App API222222222.",
  });
});

// health check route
router.get("/health", (_req: Request, res: Response) => {
  successResponse(res, {
    statusCode: 200,
    message: "Server is healthy",
  });
});

// 404 route
router.use(
  asyncHandler(async (_req: Request, res: Response) => {
    throw new Error("Route not found");
  })
);

// error handler
router.use(
  (err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
    const statusCode = err.status || 500;
    const message = err.message || "Unknown Server Error";
    errorResponse(res, {
      statusCode: statusCode,
      message: message,
    });
  }
);

// export router
export default router;
