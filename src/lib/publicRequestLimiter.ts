/** Best-effort, per-instance fixed-window limiter for unauthenticated public endpoints. */
export function createPublicRequestLimiter(options: {
  windowMs: number;
  maxPerClient: number;
  maxPerInstance: number;
  maxTrackedClients?: number;
}) {
  const maxTracked = options.maxTrackedClients ?? 5_000;
  const clients = new Map<string, { start: number; count: number }>();
  let instance = { start: 0, count: 0 };

  return function allow(clientKey: string, now = Date.now()): boolean {
    if (now - instance.start >= options.windowMs) instance = { start: now, count: 0 };
    if (instance.count >= options.maxPerInstance) return false;
    let client = clients.get(clientKey);
    if (!client || now - client.start >= options.windowMs) {
      if (clients.size >= maxTracked) {
        for (const [key, tracked] of clients) {
          if (now - tracked.start >= options.windowMs) clients.delete(key);
        }
        if (clients.size >= maxTracked) clients.clear();
      }
      client = { start: now, count: 0 };
      clients.set(clientKey, client);
    }
    if (client.count >= options.maxPerClient) return false;
    client.count += 1;
    instance.count += 1;
    return true;
  };
}

export function requestClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}
