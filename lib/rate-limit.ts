type RateLimitRule = {
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_STORE_SIZE = 5000;

const cleanupExpiredEntries = (now: number) => {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
};

export const clearRateLimitStore = () => {
  rateLimitStore.clear();
};

export const checkRateLimit = (
  key: string,
  rule: RateLimitRule,
  now: number = Date.now(),
): RateLimitResult => {
  if (rateLimitStore.size > MAX_STORE_SIZE) {
    cleanupExpiredEntries(now);
  }

  const scopedKey = `${key}:${rule.limit}:${rule.windowMs}`;
  const existing = rateLimitStore.get(scopedKey);

  if (!existing || now >= existing.resetAt) {
    rateLimitStore.set(scopedKey, {
      count: 1,
      resetAt: now + rule.windowMs,
    });

    return {
      allowed: true,
      limit: rule.limit,
      remaining: Math.max(rule.limit - 1, 0),
      retryAfter: 0,
    };
  }

  if (existing.count >= rule.limit) {
    return {
      allowed: false,
      limit: rule.limit,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  rateLimitStore.set(scopedKey, existing);

  return {
    allowed: true,
    limit: rule.limit,
    remaining: Math.max(rule.limit - existing.count, 0),
    retryAfter: 0,
  };
};
