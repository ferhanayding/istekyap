import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyLive } from "@/lib/live-server";

// "Çalıyor" işareti bu süre sonra kendiliğinden kapanır
export const NOW_PLAYING_MS = 5 * 60_000;

export type AppState = {
    /** "Geceyi başlat" ile açılır, "Geceyi bitir" ile kapanır */
    nightOpen: boolean;
    nightStartedAt: string | null;
    nightEndedAt: string | null;
    requestsOpen: boolean;
    votingOpen: boolean;
    playlistVisible: boolean;
    nowPlaying: string | null;
    nowPlayingTitle: string | null;
    nowPlayingCover: string | null;
    played: string[];
};

// 2 saniye bellekte durur, her istekte veritabanına gidilmez
let cache: { state: AppState; expires: number } | null = null;

// Süresi dolan şarkıyı kapat. Çalan bir istekse "Çalındı"ya düşer
async function expireNowPlaying(id: string) {
    const a = await supabaseAdmin
        .from("requests")
        .update({ status: "played" })
        .eq("spotify_id", id)
        .eq("status", "approved");
    if (a.error) console.error(a.error);

    const b = await supabaseAdmin
        .from("app_state")
        .update({
            now_playing: null,
            now_playing_title: null,
            now_playing_cover: null,
            now_playing_since: null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", 1)
        .eq("now_playing", id);
    if (b.error) console.error(b.error);
    notifyLive("state", "requests");
}

export async function getAppState(
    opts: { fresh?: boolean } = {}
): Promise<AppState> {
    if (!opts.fresh && cache && Date.now() < cache.expires) return cache.state;

    const [s, p] = await Promise.all([
        supabaseAdmin
            .from("app_state")
            // "*": gece.sql henüz çalıştırılmadıysa yeni sütunlar yoktur, yine de okunabilsin
            .select("*")
            .eq("id", 1)
            .maybeSingle(),
        supabaseAdmin.from("played_songs").select("spotify_id"),
    ]);
    if (s.error) throw s.error;
    if (p.error) throw p.error;

    let nowPlaying: string | null = s.data?.now_playing ?? null;
    let nowPlayingTitle: string | null = s.data?.now_playing_title ?? null;
    let nowPlayingCover: string | null = s.data?.now_playing_cover ?? null;
    const since = s.data?.now_playing_since
        ? new Date(s.data.now_playing_since).getTime()
        : null;

    if (nowPlaying && since !== null && Date.now() - since >= NOW_PLAYING_MS) {
        await expireNowPlaying(nowPlaying);
        nowPlaying = null;
        nowPlayingTitle = null;
        nowPlayingCover = null;
    }

    const state: AppState = {
        ...readFlags(s.data),
        nightStartedAt: s.data?.night_started_at ?? null,
        nightEndedAt: s.data?.night_ended_at ?? null,
        nowPlaying,
        nowPlayingTitle,
        nowPlayingCover,
        played: (p.data ?? []).map((r) => String(r.spotify_id)),
    };
    cache = { state, expires: Date.now() + 2_000 };
    return state;
}

type FlagRow = {
    requests_open?: boolean | null;
    voting_open?: boolean | null;
    playlist_visible?: boolean | null;
    night_open?: boolean | null;
} | null;

// Satır yoksa her şey kapalı, playlist açık sayılır. gece.sql çalıştırılmadıysa:
// istek ya da oylama açıksa gece açık sayılır.
export function readFlags(row: FlagRow) {
    const requestsOpen = !!row?.requests_open;
    const votingOpen = !!row?.voting_open;
    const nightOpen =
        typeof row?.night_open === "boolean" ? row.night_open : requestsOpen || votingOpen;
    return {
        nightOpen,
        requestsOpen,
        votingOpen,
        playlistVisible: row?.playlist_visible !== false,
    };
}

export function clearAppStateCache() {
    cache = null;
}