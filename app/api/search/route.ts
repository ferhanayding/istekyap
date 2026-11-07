import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/search";
import { getIp, limitDeviceAndIp } from "@/lib/rate-limit";
import { getOrCreateDeviceId } from "@/lib/device";
import { getPlaylistIndex, isInPlaylist } from "@/lib/playlist-index";

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2 || q.length > 100) return NextResponse.json([]);

    // Cihaz başına dakikada 30 arama, aynı IP'den (ortak Wi-Fi) dakikada 300
    const limit = limitDeviceAndIp(
        "search",
        await getOrCreateDeviceId(),
        getIp(req),
        { limit: 30, windowMs: 60_000 },
        { limit: 300, windowMs: 60_000 }
    );
    if (!limit.ok) {
        return NextResponse.json(
            { error: "Çok fazla arama yaptın, biraz bekle." },
            { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
        );
    }

    try {
        const [items, index] = await Promise.all([
            searchTracks(q),
            // Playlist alınamazsa arama yine çalışsın, sadece filtre uygulanmaz
            getPlaylistIndex().catch(() => null),
        ]);

        // Playlistteki şarkılar da istenebilir: gizlenmez, "Listemizde" diye işaretlenir
        const visible = items.map((t) => ({
            ...t,
            inPlaylist: index ? isInPlaylist(index, t) : false,
        }));

        return NextResponse.json(visible.slice(0, 8));
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Arama başarısız" }, { status: 502 });
    }
}