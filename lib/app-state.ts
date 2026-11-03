import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type AppState = {
    requestsOpen: boolean;
    votingOpen: boolean;
    nowPlaying: string | null;
    nowPlayingTitle: string | null;
    played: string[];
};

// 3 saniye bellekte durur, her istekte veritabanına gidilmez
let cache: { state: AppState; expires: number } | null = null;

export async function getAppState(
    opts: { fresh?: boolean } = {}
): Promise<AppState> {
    if (!opts.fresh && cache && Date.now() < cache.expires) return cache.state;

    const [s, p] = await Promise.all([
        supabaseAdmin
            .from("app_state")
            .select("requests_open, voting_open, now_playing, now_playing_title")
            .eq("id", 1)
            .maybeSingle(),
        supabaseAdmin.from("played_songs").select("spotify_id"),
    ]);
    if (s.error) throw s.error;
    if (p.error) throw p.error;

    // Satır yoksa her şey kapalı sayılır
    const state: AppState = {
        requestsOpen: !!s.data?.requests_open,
        votingOpen: !!s.data?.voting_open,
        nowPlaying: s.data?.now_playing ?? null,
        nowPlayingTitle: s.data?.now_playing_title ?? null,
        played: (p.data ?? []).map((r) => String(r.spotify_id)),
    };
    cache = { state, expires: Date.now() + 3_000 };
    return state;
}

export function clearAppStateCache() {
    cache = null;
}