import { checkRateLimit, clearRateLimitStore } from '@/lib/rate-limit';

describe('rate-limit utility', () => {
  const rule = { limit: 2, windowMs: 60_000 };

  beforeEach(() => {
    clearRateLimitStore();
  });

  it('allows requests within limit and blocks over limit', () => {
    const first = checkRateLimit('key-a', rule, 1_000);
    const second = checkRateLimit('key-a', rule, 1_500);
    const third = checkRateLimit('key-a', rule, 2_000);

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it('returns retryAfter when blocked', () => {
    checkRateLimit('key-b', rule, 10_000);
    checkRateLimit('key-b', rule, 11_000);

    const blocked = checkRateLimit('key-b', rule, 12_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it('resets counter after window passes', () => {
    checkRateLimit('key-c', rule, 100);
    checkRateLimit('key-c', rule, 200);

    const afterWindow = checkRateLimit('key-c', rule, 60_200);
    expect(afterWindow.allowed).toBe(true);
    expect(afterWindow.remaining).toBe(1);
  });

  it('tracks counters independently per key', () => {
    checkRateLimit('key-d-1', rule, 1_000);
    const otherKey = checkRateLimit('key-d-2', rule, 1_100);

    expect(otherKey.allowed).toBe(true);
    expect(otherKey.remaining).toBe(1);
  });
});
