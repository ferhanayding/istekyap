import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyLive } from "@/lib/live-server";

// "Çalıyor" işareti bu süre sonra kendiliğinden kapanır
export const NOW_PLAYING_MS = 5 * 60_000;

export type AppState = {
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
            .select(
                "requests_open, voting_open, playlist_visible, now_playing, now_playing_title, now_playing_cover, now_playing_since"
            )
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

    // Satır yoksa istek ve oylama kapalı, playlist açık sayılır
    const state: AppState = {
        requestsOpen: !!s.data?.requests_open,
        votingOpen: !!s.data?.voting_open,
        playlistVisible: s.data ? s.data.playlist_visible !== false : true,
        nowPlaying,
        nowPlayingTitle,
        nowPlayingCover,
        played: (p.data ?? []).map((r) => String(r.spotify_id)),
    };
    cache = { state, expires: Date.now() + 2_000 };
    return state;
}

export function clearAppStateCache() {
    cache = null;
}