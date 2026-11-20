import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getIp, limitDeviceAndIp } from "@/lib/rate-limit";
import { getOrCreateDeviceId } from "@/lib/device";
import { allRows } from "@/lib/all-rows";
import { isBlockedComment } from "@/lib/blocklist";
import { notifyLive } from "@/lib/live-server";
import { hasLink, type CommentsResponse, type PublicComment } from "@/lib/visitor-types";

const WINDOW_MS = 10 * 60_000; // 10 dakikada
const MAX_PER_WINDOW = 3; // cihaz başına en fazla 3 yorum
const MAX_PER_IP = 60; // aynı IP (ortak Wi-Fi) için toplam
const MAX_MESSAGE = 500;
const MAX_NAME = 30;
// "Yorumlar" sekmesinde en fazla bu kadar yorum (en yeniler)
const MAX_SHOWN = 100;

const fail = (error: string, status: number) =>
    NextResponse.json({ error }, { status });

// Herkese açık liste: aynı anda açan çok sayıda telefon için kısa süre bellekte durur
let cache: { data: CommentsResponse; expires: number } | null = null;

async function build(): Promise<CommentsResponse> {
    const [latest, ratings] = await Promise.all([
        // Yazılı yorumlar; birkaçı filtreye takılabilir diye biraz fazlası okunur
        supabaseAdmin
            .from("comments")
            .select("id, rating, message, name, created_at")
            .neq("message", "")
            .order("created_at", { ascending: false })
            .limit(MAX_SHOWN * 2),
        // Ortalama: sadece yıldız verenler dahil bütün puanlar
        allRows<{ rating: number }>("comments", "rating"),
    ]);
    if (latest.error) throw latest.error;

    const items: PublicComment[] = [];
    for (const c of latest.data ?? []) {
        const message = String(c.message ?? "").trim();
        const name = String(c.name ?? "").trim();
        // Filtreden önce yazılmış ya da sonradan listeye eklenen kelimeleri içerenler gösterilmez
        // (dashboard'da görünmeye devam eder)
        if (!message || isBlockedComment(message) || isBlockedComment(name) || hasLink(message)) {
            continue;
        }
        items.push({
            id: String(c.id),
            rating: Number(c.rating),
            message,
            name,
            createdAt: String(c.created_at),
        });
        if (items.length >= MAX_SHOWN) break;
    }

    const valid = ratings.map((r) => Number(r.rating)).filter((r) => r >= 1 && r <= 5);
    const average = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
    return { items, count: valid.length, average: Math.round(average * 10) / 10 };
}

export async function GET(req: NextRequest) {
    // ?v=: canlı sinyalden sonra (yeni yorum, silinen yorum). Bellekteki kopya atlanır,
    // aynı v'yi isteyen herkese CDN aynı cevabı verir.
    const v = req.nextUrl.searchParams.has("v");
    try {
        if (v || !cache || Date.now() > cache.expires) {
            cache = { data: await build(), expires: Date.now() + 10_000 };
        }
        return NextResponse.json(cache.data, {
            headers: { "Cache-Control": v ? "public, s-maxage=30" : "public, s-maxage=15" },
        });
    } catch (e) {
        console.error(e);
        return fail("Yorumlar alınamadı.", 500);
    }
}

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

    // Yorumlar herkese açık: küfür, hakaret ve link kabul edilmez
    if (isBlockedComment(message)) {
        return fail("Yorumunda uygunsuz bir kelime var, lütfen düzelt.", 400);
    }
    if (isBlockedComment(name)) return fail("İsminde uygunsuz bir kelime var.", 400);
    if (hasLink(message) || hasLink(name)) return fail("Yoruma link eklenemez.", 400);

    const limit = limitDeviceAndIp(
        "comment",
        await getOrCreateDeviceId(),
        getIp(req),
        { limit: MAX_PER_WINDOW, windowMs: WINDOW_MS },
        { limit: MAX_PER_IP, windowMs: WINDOW_MS }
    );
    if (!limit.ok) {
        return fail("Çok sık yorum yapıyorsun, biraz sonra tekrar dene.", 429);
    }

    const { error } = await supabaseAdmin
        .from("comments")
        .insert({ rating, message, name });
    if (error) {
        console.error(error);
        return fail("Yorum gönderilemedi, tekrar dene.", 500);
    }

    cache = null;
    // Yorumlar sekmesi açık olan telefonlar hemen görsün (sadece yıldız verildiyse listede bir şey değişmez,
    // ama ortalama değişir)
    notifyLive("comments");
    return NextResponse.json({ ok: true });
}
