import type { ErrorRequestHandler, RequestHandler } from 'express';

// An expected failure with an HTTP status and a stable error code.
export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const notFound: RequestHandler = () => {
  throw new ApiError(404, 'NOT_FOUND', 'Route not found');
};

interface UnknownError {
  name?: string;
  code?: unknown;
  type?: string;
  keyPattern?: Record<string, unknown>;
  errors?: Record<string, { message: string }>;
}

// Convert library and database failures to the common error shape.
function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) {
    return err;
  }
  const error = (err ?? {}) as UnknownError;

  // Body parser failures.
  if (error.type === 'entity.parse.failed') {
    return new ApiError(400, 'VALIDATION_ERROR', 'Request body is not valid JSON');
  }
  if (error.type === 'entity.too.large') {
    return new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds 32 KB');
  }

  // MongoDB unique index failure.
  if (error.code === 11000) {
    const fields: Record<string, string> = {};
    for (const key of Object.keys(error.keyPattern ?? {})) {
      fields[key] = `${key} already exists`;
    }
    return new ApiError(409, 'DUPLICATE_VALUE', 'A record with this value already exists', fields);
  }

  // Mongoose schema failures. Request validation normally stops these earlier.
  if (error.name === 'ValidationError' && error.errors) {
    const fields: Record<string, string> = {};
    for (const [key, detail] of Object.entries(error.errors)) {
      fields[key] = detail.message;
    }
    return new ApiError(400, 'VALIDATION_ERROR', 'Invalid data', fields);
  }
  if (error.name === 'CastError') {
    return new ApiError(400, 'INVALID_ID', 'Invalid identifier');
  }

  if (/^Mongo(ose)?(ServerSelection|Network|NotConnected)/.test(error.name ?? '')) {
    return new ApiError(503, 'DATABASE_UNAVAILABLE', 'Database is unavailable; retry later');
  }

  return new ApiError(500, 'INTERNAL_ERROR', 'Unexpected server error');
}

// Mount this handler last. Express 5 sends rejected async handlers here.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const apiError = toApiError(err);
  if (apiError.status >= 500) {
    // Keep the stack in the server log only. The response never contains it.
    console.error(err);
  }
  res.status(apiError.status).json({
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.fields && { fields: apiError.fields }),
    },
  });
};
