import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { clearAppStateCache, getAppState } from "@/lib/app-state";
import { clearLikeCountsCache } from "@/lib/votes";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyLive } from "@/lib/live-server";
import { getTrackById } from "@/lib/search";
import { getPlaylistIndex, isInPlaylist } from "@/lib/playlist-index";
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

async function setNowPlaying(
    id: string | null,
    title: string | null,
    cover: string | null = null
) {
    const { error } = await supabaseAdmin
        .from("app_state")
        .update({
            now_playing: id,
            now_playing_title: title,
            now_playing_cover: cover,
            now_playing_since: id ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
    if (error) throw error;
}
// Playlistte olmayan şarkı istek listesine de girer, böylece oylanabilir
async function ensureRequest(id: string) {
    const [index, track] = await Promise.all([
        getPlaylistIndex().catch(() => null),
        getTrackById(id).catch(() => null),
    ]);
    if (!track) return;
    if (index && isInPlaylist(index, track)) return;

    const { data: row, error } = await supabaseAdmin
        .from("requests")
        .select("id, status")
        .eq("spotify_id", id)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) throw error;

    if (row) {
        if (row.status !== "approved") {
            const { error: e } = await supabaseAdmin
                .from("requests")
                .update({ status: "approved" })
                .eq("id", row.id);
            if (e && e.code !== "23505") throw e;
        }
        return;
    }

    const { error: e } = await supabaseAdmin.from("requests").insert({
        spotify_id: track.id,
        name: track.name,
        artists: track.artists,
        cover: track.cover,
        status: "approved",
    });
    if (e && e.code !== "23505") throw e;
}
const NEW_NIGHT = new Set([
    "reset_played",
    "reset_votes",
    "archive_requests",
    "reset_requests",
    "reset_stats",
]);

// gece-baslangici.sql çalıştırılmadıysa sütun yoktur: buton yine çalışsın
async function markNight(at: string | null) {
    const { error } = await supabaseAdmin
        .from("app_state")
        .update({ night_started_at: at })
        .eq("id", 1);
    if (error) console.warn("night_started_at yazılamadı:", error.message);
}

// İstatistik için her çalma kaydedilir. Yanlışlıkla iki kere basılırsa
// (aynı şarkı 3 dakika içinde) ikinci sayılmaz.
async function logPlay(
    id: string,
    track: { name: string; artists: string; cover: string | null } | null
) {
    const { data: last } = await supabaseAdmin
        .from("play_history")
        .select("played_at")
        .eq("spotify_id", id)
        .order("played_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (last && Date.now() - new Date(last.played_at).getTime() < 3 * 60_000) return;

    const { error } = await supabaseAdmin.from("play_history").insert({
        spotify_id: id,
        name: track?.name ?? null,
        artists: track?.artists ?? null,
        cover: track?.cover ?? null,
    });
    if (error) throw error;
}

// Son "İstek listesini arşivle"yi geri alır. Bir seferde arşivlenenlerin hepsi aynı
// archived_at'i taşır. Arşivden sonra aynı şarkı yeniden istendiyse ikisi birleşir.
async function unarchiveLast(): Promise<boolean> {
    const { data: last, error } = await supabaseAdmin
        .from("requests")
        .select("archived_at")
        .not("archived_at", "is", null)
        .order("archived_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    if (!last) return false;

    const { data: rows, error: e1 } = await supabaseAdmin
        .from("requests")
        .select("id, spotify_id, status, request_count, last_requested_at")
        .eq("archived_at", last.archived_at);
    if (e1) throw e1;
    if (!rows?.length) return false;

    const { data: active, error: e2 } = await supabaseAdmin
        .from("requests")
        .select("id, spotify_id, request_count, last_requested_at")
        .is("archived_at", null)
        .in("status", ["pending", "approved", "rejected"])
        .in("spotify_id", rows.map((r) => r.spotify_id));
    if (e2) throw e2;
    const bySong = new Map((active ?? []).map((a) => [a.spotify_id, a]));

    const restore: string[] = [];
    for (const r of rows) {
        const twin = r.status === "played" ? undefined : bySong.get(r.spotify_id);
        if (!twin) {
            restore.push(r.id);
            continue;
        }
        // Yeni listedeki aynı şarkıya sayacını ekle, eski satırı kaldır
        const latest =
            r.last_requested_at > twin.last_requested_at
                ? r.last_requested_at
                : twin.last_requested_at;
        const { error: e3 } = await supabaseAdmin
            .from("requests")
            .update({
                request_count: twin.request_count + r.request_count,
                last_requested_at: latest,
            })
            .eq("id", twin.id);
        if (e3) throw e3;
        twin.request_count += r.request_count;
        const { error: e4 } = await supabaseAdmin.from("requests").delete().eq("id", r.id);
        if (e4) throw e4;
    }

    if (restore.length) {
        const { error: e5 } = await supabaseAdmin
            .from("requests")
            .update({ archived_at: null })
            .in("id", restore);
        if (e5) throw e5;
    }
    return true;
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
                await ensureRequest(id).catch((e) => console.error(e));

                const { error } = await supabaseAdmin
                    .from("played_songs")
                    .upsert(
                        { spotify_id: id, played_at: new Date().toISOString() },
                        { onConflict: "spotify_id" }
                    );
                if (error) throw error;

                const track = await getTrackById(id).catch(() => null);
                await logPlay(id, track).catch((e) => console.error(e));
                await setNowPlaying(
                    id,
                    track ? `${track.name} · ${track.artists}` : title,
                    track?.cover ?? null
                );
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
                // Oylar listeden kalkar ama toplamları istatistik için vote_history'de kalır
                const { error } = await supabaseAdmin.rpc("archive_votes");
                if (error) throw error;
                clearLikeCountsCache();
                break;
            }
            case "archive_requests": {
                // Yeni gece: bekleyen, çalınan ve reddedilenler arşive gider (silinmez),
                // onaylı ama henüz çalınmamışlar listede kalır. Sayaçlar sıfırdan başlar.
                const { error } = await supabaseAdmin
                    .from("requests")
                    .update({ archived_at: new Date().toISOString() })
                    .is("archived_at", null)
                    .in("status", ["pending", "played", "rejected"]);
                if (error) throw error;
                break;
            }
            case "unarchive_last": {
                const result = await unarchiveLast();
                if (!result) {
                    return NextResponse.json(
                        { error: "Geri alınacak arşiv yok." },
                        { status: 404 }
                    );
                }
                break;
            }
            case "reset_stats": {
                // Ömür boyu istatistik sıfırdan: çalma ve oy geçmişi, arşivdeki istekler.
                // Bu geceki liste, oylar ve yorumlar dokunulmadan kalır.
                const steps = await Promise.all([
                    supabaseAdmin.from("play_history").delete().not("id", "is", null),
                    supabaseAdmin.from("vote_history").delete().not("id", "is", null),
                    supabaseAdmin.from("requests").delete().not("archived_at", "is", null),
                ]);
                const failed = steps.find((r) => r.error);
                if (failed?.error) throw failed.error;
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

        // "Yeni gece" butonları istatistikteki "Bu gece"yi şimdiden başlatır
        if (NEW_NIGHT.has(body.action)) await markNight(new Date().toISOString());
        if (body.action === "unarchive_last") await markNight(null);

        clearAppStateCache();
        notifyLive("state", "requests");
        return NextResponse.json(await getAppState({ fresh: true }), {
            headers: NO_STORE,
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "İşlem yapılamadı." }, { status: 500 });
    }
}