import { NextRequest, NextResponse } from "next/server";
import { getLyrics } from "@/lib/lrclib";
import { readDeviceId } from "@/lib/device";
import { getIp, limitDeviceAndIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
    const name = req.nextUrl.searchParams.get("name")?.trim() ?? "";
    const artists = req.nextUrl.searchParams.get("artists")?.trim() ?? "";
    if (!name || name.length > 150 || artists.length > 200) {
        return NextResponse.json({ error: "Geçersiz şarkı." }, { status: 400 });
    }

    // Cihaz başına dakikada 20, aynı IP'den (ortak Wi-Fi) dakikada 200.
    // Çerez yazılmaz ki cevap CDN'de önbelleğe alınabilsin; çerezi olmayan IP ile sayılır.
    const ip = getIp(req);
    const limit = limitDeviceAndIp(
        "lyrics",
        (await readDeviceId()) ?? `ip:${ip}`,
        ip,
        { limit: 20, windowMs: 60_000 },
        { limit: 200, windowMs: 60_000 }
    );
    if (!limit.ok) {
        return NextResponse.json(
            { error: "Çok fazla istek, biraz bekle." },
            { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
        );
    }

    try {
        const result = await getLyrics(name, artists);
        // Aynı şarkının sözü değişmez: Vercel CDN'i 1 gün (bulunamadıysa 1 saat) saklar,
        // böylece 30 kişi aynı şarkıya bassa da fonksiyon bir kez çalışır
        const maxAge = result.ok ? 86_400 : 3_600;
        return NextResponse.json(result, {
            headers: { "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge}` },
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Sözler alınamadı." }, { status: 502 });
    }
}
