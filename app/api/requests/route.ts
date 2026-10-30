import { NextRequest, NextResponse } from "next/server";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { getPlaylistIndex, isInPlaylist } from "@/lib/playlist-index";
export async function POST(req: NextRequest) {
    const limit = rateLimit(`request:${getIp(req)}`, 5, 10 * 60_000);
    if (!limit.ok) {
        return NextResponse.json(
            { error: "Çok fazla istek gönderdin, biraz bekle." },
            { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
        );
    }
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    const { id, name, artists } = body;
    if (
        typeof id !== "string" || !id || id.length > 40 ||
        typeof name !== "string" || name.length > 200 ||
        typeof artists !== "string" || artists.length > 300
    ) {
        return NextResponse.json({ error: "Geçersiz şarkı" }, { status: 400 });
    }

    // TODO: veritabanına kaydet. Şimdilik sadece terminale yazıyor.
    const index = await getPlaylistIndex().catch(() => null);
    if (index && isInPlaylist(index, { id, name, artists })) {
        return NextResponse.json(
            { error: "Bu şarkı zaten playlistte." },
            { status: 409 }
        );
    }
    console.log("[İSTEK]", { id, name, artists, at: new Date().toISOString() });

    return NextResponse.json({ ok: true }, { status: 201 });
}