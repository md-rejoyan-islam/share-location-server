import { Response } from "express";

const errorResponse = (
  res: Response,
  {
    statusCode = 500,
    message = "Unknown Server Error",
  }: { statusCode?: number; message?: string }
) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      status: statusCode,
      message,
    },
  });
};

const successResponse = (
  res: Response,
  {
    statusCode = 200,
    message = "Success",
    payload,
  }: { statusCode?: number; message?: string; payload?: any }
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...payload,
  });
};

export { errorResponse, successResponse };
