import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { clearAppStateCache, getAppState } from "@/lib/app-state";
import { clearLikeCountsCache } from "@/lib/votes";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;
const NO_STORE = { "Cache-Control": "no-store" };

// Çalan şarkı bir istekse, bitince "Çalındı"ya düşer
async function finishRequest(spotifyId: string) {
    const { error } = await supabaseAdmin
        .from("requests")
        .update({ status: "played" })
        .eq("spotify_id", spotifyId)
        .eq("status", "approved");
    if (error) throw error;
}

async function setNowPlaying(id: string | null, title: string | null) {
    const { error } = await supabaseAdmin
        .from("app_state")
        .update({
            now_playing: id,
            now_playing_title: title,
            now_playing_since: id ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
    if (error) throw error;
}

export async function GET() {
    if (!(await requireUser())) {
        return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }
    try {
        return NextResponse.json(await getAppState({ fresh: true }), {
            headers: NO_STORE,
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Durum alınamadı." }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!(await requireUser())) {
        return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    try {
        switch (body?.action) {
            case "set": {
                const { key, value } = body;
                if (
                    !["requests_open", "voting_open", "playlist_visible"].includes(key) ||
                    typeof value !== "boolean"
                ) {
                    return NextResponse.json({ error: "Geçersiz ayar." }, { status: 400 });
                }
                const { error } = await supabaseAdmin
                    .from("app_state")
                    .update({ [key]: value, updated_at: new Date().toISOString() })
                    .eq("id", 1);
                if (error) throw error;
                break;
            }

            case "play": {
                const id = body.id;
                if (typeof id !== "string" || !SPOTIFY_ID.test(id)) {
                    return NextResponse.json({ error: "Geçersiz şarkı." }, { status: 400 });
                }
                const title =
                    typeof body.title === "string" ? body.title.slice(0, 120) : null;

                const current = await getAppState({ fresh: true });
                if (current.nowPlaying && current.nowPlaying !== id) {
                    await finishRequest(current.nowPlaying);
                }

                const { error } = await supabaseAdmin
                    .from("played_songs")
                    .upsert(
                        { spotify_id: id, played_at: new Date().toISOString() },
                        { onConflict: "spotify_id" }
                    );
                if (error) throw error;

                await setNowPlaying(id, title);
                break;
            }

            case "stop": {
                const current = await getAppState({ fresh: true });
                if (current.nowPlaying) await finishRequest(current.nowPlaying);
                await setNowPlaying(null, null);
                break;
            }

            case "reset_played": {
                const current = await getAppState({ fresh: true });
                if (current.nowPlaying) await finishRequest(current.nowPlaying);
                await setNowPlaying(null, null);
                const { error } = await supabaseAdmin
                    .from("played_songs")
                    .delete()
                    .neq("spotify_id", "");
                if (error) throw error;
                break;
            }

            case "reset_votes": {
                const { error } = await supabaseAdmin
                    .from("song_votes")
                    .delete()
                    .neq("spotify_id", "");
                if (error) throw error;
                clearLikeCountsCache();
                break;
            }
            case "reset_requests": {
                // Çalan şarkı bir istekse çalma işareti de kalksın
                const current = await getAppState({ fresh: true });
                if (current.nowPlaying) {
                    const { data } = await supabaseAdmin
                        .from("requests")
                        .select("id")
                        .eq("spotify_id", current.nowPlaying)
                        .limit(1);
                    if (data && data.length > 0) await setNowPlaying(null, null);
                }
                const { error } = await supabaseAdmin
                    .from("requests")
                    .delete()
                    .neq("spotify_id", "");
                if (error) throw error;
                break;
            }
            default:
                return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
        }

        clearAppStateCache();
        return NextResponse.json(await getAppState({ fresh: true }), {
            headers: NO_STORE,
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "İşlem yapılamadı." }, { status: 500 });
    }
}