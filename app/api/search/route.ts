import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/search";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { getPlaylistIndex, isInPlaylist } from "@/lib/playlist-index";

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2 || q.length > 100) return NextResponse.json([]);

    const limit = rateLimit(`search:${getIp(req)}`, 30, 60_000);
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

        const visible = index
            ? items.filter((t) => !isInPlaylist(index, t))
            : items;

        return NextResponse.json(visible.slice(0, 8));
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Arama başarısız" }, { status: 502 });
    }
}