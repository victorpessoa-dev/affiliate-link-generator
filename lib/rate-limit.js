import "server-only";
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;
const entries = new Map();
export function consumeRateLimit(key) {
    const now = Date.now();
    if (entries.size > 1_000) {
        for (const [entryKey, entry] of entries) {
            if (entry.resetAt <= now)
                entries.delete(entryKey);
        }
    }
    const current = entries.get(key);
    if (!current || current.resetAt <= now) {
        entries.set(key, {
            count: 1,
            resetAt: now + WINDOW_MS,
        });
        return { allowed: true, retryAfter: 0 };
    }
    if (current.count >= MAX_REQUESTS) {
        return {
            allowed: false,
            retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
        };
    }
    current.count += 1;
    return { allowed: true, retryAfter: 0 };
}
