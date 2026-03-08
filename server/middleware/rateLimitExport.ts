/**
 * Rate limiter for document export endpoint (PII).
 * Config via env: EXPORT_RATE_LIMIT_MAX, EXPORT_RATE_LIMIT_WINDOW_MS.
 * Keys by user id when authenticated, else by IP. No secrets in code.
 */
import type { Request, Response, NextFunction } from "express";

const DEFAULT_MAX = 30;
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute

function getLimit(): { max: number; windowMs: number } {
  const max = process.env.EXPORT_RATE_LIMIT_MAX;
  const windowMs = process.env.EXPORT_RATE_LIMIT_WINDOW_MS;
  return {
    max: max ? Math.max(1, parseInt(max, 10)) : DEFAULT_MAX,
    windowMs: windowMs ? Math.max(1000, parseInt(windowMs, 10)) : DEFAULT_WINDOW_MS,
  };
}

const hits = new Map<string, number[]>();

function prune(key: string, windowMs: number): void {
  const list = hits.get(key);
  if (!list) return;
  const cutoff = Date.now() - windowMs;
  const kept = list.filter((t) => t > cutoff);
  if (kept.length === 0) hits.delete(key);
  else hits.set(key, kept);
}

export function rateLimitExport(req: Request, res: Response, next: NextFunction): void {
  const { max, windowMs } = getLimit();
  const userId = (req as any).session?.userId ?? (req as any).user?.claims?.sub;
  const key = userId ? `u:${userId}` : `ip:${req.ip ?? req.socket?.remoteAddress ?? "unknown"}`;

  prune(key, windowMs);
  const list = hits.get(key) ?? [];
  if (list.length >= max) {
    res.set("Retry-After", String(Math.ceil(windowMs / 1000)));
    res.status(429).json({ message: "Too many export requests; try again later." });
    return;
  }
  list.push(Date.now());
  hits.set(key, list);
  next();
}
