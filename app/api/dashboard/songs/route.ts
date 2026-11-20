import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getPlaylist } from "@/lib/playlist";
import { getVoteTotals } from "@/lib/votes";

// Playlist ortak önbellekten gelir (lib/playlist), Spotify'a her turda gidilmez
const tracks = async () => (await getPlaylist()).tracks;

export async function GET() {
    if (!(await requireUser())) {
        return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    try {
        // Beğeni/beğenmeme: bugüne kadarki toplam, ziyaretçinin sitede gördüğüyle aynı
        // (gecelik döküm İstatistik sekmesinde)
        const [list, totals] = await Promise.all([tracks(), getVoteTotals()]);
        const counts = new Map(totals.map((v) => [v.spotify_id, v]));

        const out = list.map((t) => ({
            id: t.id,
            name: t.name,
            artists: t.artists,
            cover: t.cover,
            url: t.url,
            likes: counts.get(t.id)?.likes ?? 0,
            dislikes: counts.get(t.id)?.dislikes ?? 0,
        }));

        return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Liste alınamadı." }, { status: 500 });
    }
}