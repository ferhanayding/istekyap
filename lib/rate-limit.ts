type Entry = { count: number; reset: number };
const hits = new Map<string, Entry>();

export function rateLimit(key: string, limit: number, windowMs: number) {
    const now = Date.now();

    // Bellek şişmesin diye süresi dolanları temizle
    if (hits.size > 5000) {
        for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
    }

    const entry = hits.get(key);
    if (!entry || now > entry.reset) {
        hits.set(key, { count: 1, reset: now + windowMs });
        return { ok: true, retryAfter: 0 };
    }

    entry.count++;
    if (entry.count > limit) {
        return { ok: false, retryAfter: Math.ceil((entry.reset - now) / 1000) };
    }
    return { ok: true, retryAfter: 0 };
}

export function getIp(req: Request): string {
    return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}