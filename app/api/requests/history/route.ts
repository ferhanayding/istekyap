import { NextResponse, type NextRequest } from "next/server";
import { allRows } from "@/lib/all-rows";
import { isBlocked } from "@/lib/blocklist";
import type { HistorySong } from "@/lib/history-types";
import { aggregate, type ReqRow } from "@/lib/history";

// En fazla bu kadar şarkı (en çok istenenler)
const MAX = 500;

// Aynı anda gelen çok sayıda ziyaretçi için kısa süre bellekte tutulur
let cache: { list: HistorySong[]; expires: number } | null = null;

async function build(): Promise<HistorySong[]> {
    const [reqs, plays, voteHist, votes] = await Promise.all([
        allRows<ReqRow>(
            "requests",
            "spotify_id, name, artists, cover, status, request_count, created_at, last_requested_at"
        ),
        allRows<{ spotify_id: string }>("play_history", "spotify_id"),
        allRows<{ spotify_id: string; likes: number }>("vote_history", "spotify_id, likes"),
        allRows<{ spotify_id: string; value: number }>("song_votes", "spotify_id, value"),
    ]);

    const songs = aggregate(reqs, plays, voteHist, votes);
    return songs
        .filter((s) => !isBlocked(`${s.name} ${s.artists}`))
        .sort(
            (a, b) =>
                b.requests - a.requests ||
                (a.lastRequested < b.lastRequested ? 1 : -1)
        )
        .slice(0, MAX);
}

export async function GET(req: NextRequest) {
    // ?v=: canlı sinyalden sonra (yeni istek, gece bitti). Bellekteki kopya atlanır,
    // aynı v'yi isteyen herkese CDN aynı cevabı verir.
    const v = req.nextUrl.searchParams.has("v");
    try {
        if (v || !cache || Date.now() > cache.expires) {
            cache = { list: await build(), expires: Date.now() + 10_000 };
        }
        return NextResponse.json(cache.list, {
            headers: {
                "Cache-Control": v ? "public, s-maxage=30" : "public, s-maxage=10",
            },
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Eski istekler alınamadı." }, { status: 500 });
    }
}
