import { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  // Log request start
  console.log(`📥 ${req.method} ${req.path} - ${req.ip} - ${new Date().toISOString()}`);
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): any {
    const duration = Date.now() - startTime;
    const statusColor = res.statusCode >= 400 ? '🔴' : res.statusCode >= 300 ? '🟡' : '🟢';
    
    console.log(
      `📤 ${req.method} ${req.path} - ${statusColor} ${res.statusCode} - ${duration}ms - ${req.ip}`
    );
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
}
