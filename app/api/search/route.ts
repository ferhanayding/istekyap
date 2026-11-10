import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/search";
import { getIp, limitDeviceAndIp } from "@/lib/rate-limit";
import { getOrCreateDeviceId } from "@/lib/device";
import { getPlaylistIndex, isInPlaylist } from "@/lib/playlist-index";
import { BLOCKED_MESSAGE, isBlocked } from "@/lib/blocklist";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2 || q.length > 100) return NextResponse.json([]);

    // Dashboard (scope=all, giriş yapmış grup üyesi): filtre yok, her şarkı çıkar
    const wantsAll = req.nextUrl.searchParams.get("scope") === "all";
    const all = wantsAll && !!(await requireUser());

    // Tarayıcıdaki kontrol atlanırsa diye sunucuda da bakılır
    if (!all && isBlocked(q)) {
        return NextResponse.json({ error: BLOCKED_MESSAGE }, { status: 400 });
    }

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
        // Spotify'ın "müstehcen" (explicit) etiketli şarkıları ve küfürlü adlar görünmez.
        // Playlistimizdeki şarkılar etiketli olsa da kalır (repertuvar bizim seçimimiz).
        const visible = items
            .map((t) => ({
                ...t,
                inPlaylist: index ? isInPlaylist(index, t) : false,
            }))
            .filter(
                (t) =>
                    all ||
                    ((t.inPlaylist || !t.explicit) && !isBlocked(`${t.name} ${t.artists}`))
            );

        // Aynı aramayı yapan herkese 5 dk boyunca Vercel CDN cevap verir (Spotify'a gidilmez).
        // Dashboard'ın filtresiz sonucu ortak önbelleğe girmez.
        return NextResponse.json(visible.slice(0, 8), {
            headers: {
                "Cache-Control": wantsAll
                    ? "private, no-store"
                    : "public, max-age=60, s-maxage=300",
            },
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Arama başarısız" }, { status: 502 });
    }
}