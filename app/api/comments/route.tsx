import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const WINDOW_MS = 10 * 60_000; // 10 dakikada
const MAX_PER_WINDOW = 3; // en fazla 3 yorum
const MAX_MESSAGE = 500;
const MAX_NAME = 30;

// IP başına son yorum zamanları (sunucu belleğinde)
const hits = new Map<string, number[]>();

function ipOf(req: Request): string {
    return (
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "unknown"
    );
}

function tooMany(ip: string): boolean {
    const now = Date.now();
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_PER_WINDOW) {
        hits.set(ip, recent);
        return true;
    }
    recent.push(now);
    hits.set(ip, recent);

    // Bellek şişmesin
    if (hits.size > 2000) {
        for (const [k, v] of hits) {
            if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
        }
    }
    return false;
}

const fail = (error: string, status: number) =>
    NextResponse.json({ error }, { status });

export async function POST(req: Request) {
    let body: Record<string, unknown>;
    try {
        body = (await req.json()) as Record<string, unknown>;
    } catch {
        return fail("Geçersiz istek.", 400);
    }

    // Botlar için gizli alan: insan doldurmaz
    if (typeof body.website === "string" && body.website.trim() !== "") {
        return NextResponse.json({ ok: true });
    }

    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return fail("Lütfen 1 ile 5 arasında bir puan ver.", 400);
    }

    const message =
        typeof body.message === "string" ? body.message.trim() : "";
    if (message.length > MAX_MESSAGE) {
        return fail(`Yorum en fazla ${MAX_MESSAGE} karakter olabilir.`, 400);
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length > MAX_NAME) {
        return fail(`İsim en fazla ${MAX_NAME} karakter olabilir.`, 400);
    }

    if (tooMany(ipOf(req))) {
        return fail("Çok sık yorum yapıyorsun, biraz sonra tekrar dene.", 429);
    }

    const { error } = await supabaseAdmin
        .from("comments")
        .insert({ rating, message, name });
    if (error) {
        console.error(error);
        return fail("Yorum gönderilemedi, tekrar dene.", 500);
    }

    return NextResponse.json({ ok: true });
}
