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

// Çalan şarkı bir istekse, bitince "Çalındı"ya düşer. Sadece bu gecenin listesi:
// arşivdeki eski gecelerin onaylı kalmış istekleri değişmez (istatistik bozulmasın).
export async function finishRequest(spotifyId: string) {
    const { error } = await supabaseAdmin
        .from("requests")
        .update({ status: "played" })
        .eq("spotify_id", spotifyId)
        .eq("status", "approved")
        .is("archived_at", null);
    if (error) throw error;
}

// Bu gecenin "çalındı" işaretlerini siler (gece başlarken ve biterken)
export async function clearPlayedTonight() {
    const { error } = await supabaseAdmin.from("played_songs").delete().neq("spotify_id", "");
    if (error) throw error;
}

// Şarkı artık "bu gece çalındı" sayılmasın (dashboard'da Çalındı'dan geri alınınca)
export async function unmarkPlayedTonight(id: string) {
    const { error } = await supabaseAdmin.from("played_songs").delete().eq("spotify_id", id);
    if (error) throw error;
}

// "Geceyi bitir" geri alınınca: gecenin başından beri çalınanlar çalma geçmişinden geri yüklenir
export async function restorePlayedSince(sinceIso: string) {
    const { data, error } = await supabaseAdmin
        .from("play_history")
        .select("spotify_id, played_at")
        .gte("played_at", sinceIso)
        .order("played_at", { ascending: true });
    if (error) throw error;

    // Şarkı başına son çalınma
    const latest = new Map<string, string>();
    for (const r of data ?? []) latest.set(String(r.spotify_id), r.played_at);
    if (latest.size === 0) return;

    const { error: e } = await supabaseAdmin.from("played_songs").upsert(
        [...latest].map(([spotify_id, played_at]) => ({ spotify_id, played_at })),
        { onConflict: "spotify_id" }
    );
    if (e) throw e;
}
