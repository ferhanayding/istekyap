import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

type LikeRow = { spotify_id: string; likes: number };

// Beğeni sayıları 10 saniye bellekte durur, veritabanı yorulmasın
let cache: { rows: LikeRow[]; expires: number } | null = null;

export async function getLikeCounts(): Promise<LikeRow[]> {
    if (cache && Date.now() < cache.expires) return cache.rows;

    // Sadece beğeniler okunur, beğenmeme sayısı bu dosyadan hiç çıkmaz
    const { data, error } = await supabaseAdmin
        .from("song_vote_counts")
        .select("spotify_id, likes");
    if (error) throw error;

    const rows = (data ?? []).map((r) => ({
        spotify_id: String(r.spotify_id),
        likes: Number(r.likes),
    }));
    cache = { rows, expires: Date.now() + 10_000 };
    return rows;
}

export function clearLikeCountsCache() {
    cache = null;
}