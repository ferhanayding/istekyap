import "server-only";
import { allRows } from "@/lib/all-rows";

export type VoteTotal = { spotify_id: string; likes: number; dislikes: number };

// Şarkı başına bugüne kadarki toplam: önceki gecelerin oy geçmişi (vote_history) + bu gecenin
// oyları (song_votes). Gece başlarken oylar geçmişe taşınır ama toplam kaybolmaz.
// 10 saniye bellekte durur, veritabanı yorulmasın.
let cache: { rows: VoteTotal[]; expires: number } | null = null;

type Row = { spotify_id: string; likes: number | string; dislikes: number | string };

// supabase/oy-toplamlari.sql çalıştırılmadıysa görünüm yoktur
const missing = (e: unknown) => {
    const code = (e as { code?: string } | null)?.code;
    return code === "PGRST205" || code === "42P01";
};

async function readTotals(): Promise<Row[]> {
    try {
        // Toplamı veritabanı hesaplar (tek sorgu)
        return await allRows<Row>("song_vote_totals", "spotify_id, likes, dislikes");
    } catch (e) {
        if (!missing(e)) throw e;
    }
    // Görünüm yoksa: iki parçayı burada topla
    const [history, tonight] = await Promise.all([
        allRows<Row>("vote_history", "spotify_id, likes, dislikes"),
        allRows<Row>("song_vote_counts", "spotify_id, likes, dislikes"),
    ]);
    return [...history, ...tonight];
}

export async function getVoteTotals(): Promise<VoteTotal[]> {
    if (cache && Date.now() < cache.expires) return cache.rows;

    const sum = new Map<string, VoteTotal>();
    for (const r of await readTotals()) {
        const id = String(r.spotify_id);
        const s = sum.get(id) ?? { spotify_id: id, likes: 0, dislikes: 0 };
        s.likes += Number(r.likes) || 0;
        s.dislikes += Number(r.dislikes) || 0;
        sum.set(id, s);
    }
    const rows = [...sum.values()].filter((r) => r.likes > 0 || r.dislikes > 0);
    cache = { rows, expires: Date.now() + 10_000 };
    return rows;
}

export function clearVoteTotalsCache() {
    cache = null;
}
