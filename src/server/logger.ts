import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function diagnosticLogger(req: Request & { correlationId?: string }, res: Response, next: NextFunction) {
  const correlationId = (req.headers['x-correlation-id'] as string) || `req_${uuidv4().slice(0, 10)}`;
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (res.statusCode >= 400) {
      console.error(
        JSON.stringify({
          level: 'ERROR',
          correlationId,
          method: req.method,
          url: req.originalUrl || req.url,
          status: res.statusCode,
          durationMs: duration,
          timestamp: new Date().toISOString(),
        })
      );
    }
  });

  next();
}

export function logEndpointError(
  req: Request & { correlationId?: string },
  statusCode: number,
  error: unknown,
  code: string = 'SERVER_ERROR'
) {
  const correlationId = req.correlationId || 'unknown';
  const endpoint = `${req.method} ${req.originalUrl || req.url}`;
  const exceptionMsg = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(
    JSON.stringify({
      level: 'FATAL_EXCEPTION',
      correlationId,
      endpoint,
      statusCode,
      errorCode: code,
      exception: exceptionMsg,
      stack: errorStack,
      timestamp: new Date().toISOString(),
    })
  );
}
