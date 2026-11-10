import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

type SongMeta = { name: string; artists: string; cover: string | null };

// Aynı şarkı bu süre içinde ikinci kez "çalındı" sayılmaz (yanlışlıkla iki kez basılırsa)
const DEDUPE_MS = 3 * 60_000;

async function logPlay(id: string, meta: SongMeta | null) {
    const { data: last, error: e1 } = await supabaseAdmin
        .from("play_history")
        .select("played_at")
        .eq("spotify_id", id)
        .order("played_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (e1) throw e1;
    if (last && Date.now() - new Date(last.played_at).getTime() < DEDUPE_MS) return;

    const { error } = await supabaseAdmin.from("play_history").insert({
        spotify_id: id,
        name: meta?.name ?? null,
        artists: meta?.artists ?? null,
        cover: meta?.cover ?? null,
    });
    if (error) throw error;
}

async function markPlayedTonight(id: string) {
    const { error } = await supabaseAdmin
        .from("played_songs")
        .upsert(
            { spotify_id: id, played_at: new Date().toISOString() },
            { onConflict: "spotify_id" }
        );
    if (error) throw error;
}

// Bir şarkı çalındı: bu gecenin "çalındı" listesine girer (oylanabilir olur) ve
// istatistik için çalma geçmişine yazılır. Dashboard'da "Çal" da, elle "Çalındı" da bunu kullanır.
// Geçmiş kaydı yazılamazsa sadece istatistik eksik kalır, işlem başarısız sayılmaz.
export async function recordPlay(id: string, meta: SongMeta | null) {
    await Promise.all([
        markPlayedTonight(id),
        logPlay(id, meta).catch((e) => console.error("Çalma geçmişi yazılamadı:", e)),
    ]);
}
