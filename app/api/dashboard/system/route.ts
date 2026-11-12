import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { clearAppStateCache, getAppState } from "@/lib/app-state";
import { clearLikeCountsCache } from "@/lib/votes";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyLive } from "@/lib/live-server";
import { revalidateTag } from "next/cache";
import { FLAGS_TAG } from "@/lib/app-flags";
import { getTrackById } from "@/lib/search";
import type { Track } from "@/lib/spotify";
import { getPlaylistIndex, isInPlaylist } from "@/lib/playlist-index";
import {
    clearPlayedTonight,
    finishRequest,
    recordPlay,
    restorePlayedSince,
} from "@/lib/plays";
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;
const NO_STORE = { "Cache-Control": "no-store" };

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
// Çalınan şarkının bu geceki isteği onaylıya alınır (bekliyorsa da): bitince "Çalındı"ya
// düşer, listede "Bekliyor" diye asılı kalmaz. İsteği yoksa ve playlistte de değilse
// istek listesine eklenir, böylece oylanabilir.
async function ensureRequest(id: string, track: Track | null) {
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

    if (!track) return;
    const index = await getPlaylistIndex().catch(() => null);
    if (index && isInPlaylist(index, track)) return;

    const { error: e } = await supabaseAdmin.from("requests").insert({
        spotify_id: track.id,
        name: track.name,
        artists: track.artists,
        cover: track.cover,
        status: "approved",
    });
    if (e && e.code !== "23505") throw e;
}
// Gece içinde istatistik silinirse "Bu gece" de o andan yeniden başlar
const NEW_NIGHT = new Set(["reset_requests", "reset_stats"]);

// Ana sayfanın hazır HTML'ine gömülü anahtarları değiştiren işlemler
const FLAG_ACTIONS = new Set(["set", "start_night", "end_night", "undo_end"]);

// "Geceyi bitir"den sonra bu süre içinde geri alınabilir
const UNDO_END_MS = 10 * 60_000;

// gece.sql çalıştırılmadıysa yeni sütunlar yoktur
function missingColumn(e: { code?: string } | null): boolean {
    return e?.code === "PGRST204" || e?.code === "42703";
}
const NIGHT_CLOSED = "Gece kapalı. Önce Sistem sekmesinden geceyi başlat.";
const NEED_SQL ="Önce Supabase'de supabase/gece.sql dosyasını çalıştır.";

async function updateState(fields: Record<string, unknown>) {
    const { error } = await supabaseAdmin
        .from("app_state")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", 1);
    return error;
}

// Gece açılınca ve kapanınca istek ve oylama birlikte açılıp kapanır (sözler hep açık)
const NIGHT_ON = { night_open: true, requests_open: true, voting_open: true };
const NIGHT_OFF = { night_open: false, requests_open: false, voting_open: false };
const NO_PLAYING = {
    now_playing: null,
    now_playing_title: null,
    now_playing_cover: null,
    now_playing_since: null,
};

// gece-baslangici.sql çalıştırılmadıysa sütun yoktur: buton yine çalışsın
async function markNight(at: string) {
    const { error } = await supabaseAdmin
        .from("app_state")
        .update({ night_started_at: at })
        .eq("id", 1);
    if (error) console.warn("night_started_at yazılamadı:", error.message);
}

// "Geceyi bitir"de arşivlenenleri listeye geri alır. O an arşivlenenlerin hepsi aynı
// archived_at'i (gecenin bitiş anı) taşır; başka gecelerin arşivine dokunulmaz.
// Arşivden sonra aynı şarkı yeniden istendiyse ikisi birleşir.
async function unarchiveAt(stamp: string): Promise<void> {
    const { data: rows, error: e1 } = await supabaseAdmin
        .from("requests")
        .select("id, spotify_id, status, request_count, last_requested_at")
        .eq("archived_at", stamp);
    if (e1) throw e1;
    if (!rows?.length) return;

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
                const error = await updateState({ [key]: value });
                if (missingColumn(error)) {
                    return NextResponse.json({ error: NEED_SQL }, { status: 409 });
                }
                if (error) throw error;
                break;
            }

            case "start_night": {
                const current = await getAppState({ fresh: true });
                if (current.nightOpen) {
                    return NextResponse.json({ error: "Gece zaten açık." }, { status: 409 });
                }
                const now = new Date().toISOString();
                // Önce durum yazılır: sütunlar yoksa hiçbir şeye dokunmadan hata verir
                const error = await updateState({
                    ...NIGHT_ON,
                    ...NO_PLAYING,
                    night_started_at: now,
                    night_ended_at: null,
                });
                if (missingColumn(error)) {
                    return NextResponse.json({ error: NEED_SQL }, { status: 409 });
                }
                if (error) throw error;

                // Önceki geceden kalanlar ziyaretçinin ekranından kalkar, istatistikte kalır:
                // listede kalmış istekler arşive, oylar oy geçmişine gider, "çalındı" işaretleri
                // silinir. Bitir'e basıldıysa liste zaten boştur; bitişten sonra elle açılıp
                // gelen istekler bu geceye sayılır, arşivlenmez.
                const cutoff = current.nightEndedAt ?? now;
                const steps = await Promise.all([
                    supabaseAdmin
                        .from("requests")
                        .update({ archived_at: now })
                        .is("archived_at", null)
                        .lte("created_at", cutoff),
                    supabaseAdmin.rpc("archive_votes"),
                    clearPlayedTonight().then(() => ({ error: null })),
                ]);
                const failed = steps.find((r) => r.error);
                if (failed?.error) throw failed.error;
                clearLikeCountsCache();
                break;
            }

            case "end_night": {
                const current = await getAppState({ fresh: true });
                if (!current.nightOpen) {
                    return NextResponse.json({ error: "Gece zaten kapalı." }, { status: 409 });
                }
                const now = new Date().toISOString();
                // Önce her şey kapanır ki bitirirken yeni istek ya da oy gelmesin
                const error = await updateState({
                    ...NIGHT_OFF,
                    ...NO_PLAYING,
                    night_ended_at: now,
                });
                if (missingColumn(error)) {
                    return NextResponse.json({ error: NEED_SQL }, { status: 409 });
                }
                if (error) throw error;

                // Çalan şarkı bir istekse "Çalındı" olarak arşive girsin
                if (current.nowPlaying) await finishRequest(current.nowPlaying);
                // Bu gecenin bütün istekleri (onaylı ama çalınmamışlar dahil) ziyaretçinin
                // ekranından kalkar; dashboard istatistiğinde "Son gece" olarak kalır
                const { error: e } = await supabaseAdmin
                    .from("requests")
                    .update({ archived_at: now })
                    .is("archived_at", null);
                if (e) throw e;
                // Gece bitti: playlistteki "Çalındı" işaretleri de kalkar (oylar "Geceyi başlat"a
                // kadar durur, istatistikte "Son gece" olarak görünür)
                await clearPlayedTonight();
                break;
            }

            case "undo_end": {
                const current = await getAppState({ fresh: true });
                const endedAt = current.nightEndedAt
                    ? new Date(current.nightEndedAt).getTime()
                    : 0;
                if (current.nightOpen || !endedAt || Date.now() - endedAt > UNDO_END_MS) {
                    return NextResponse.json(
                        { error: "Geri alma süresi geçti." },
                        { status: 409 }
                    );
                }
                // Sadece bu bitişte arşivlenenler ve bu gecenin "çalındı" işaretleri geri gelir
                await Promise.all([
                    unarchiveAt(new Date(endedAt).toISOString()),
                    current.nightStartedAt
                        ? restorePlayedSince(new Date(current.nightStartedAt).toISOString())
                        : null,
                ]);
                const error = await updateState({ ...NIGHT_ON, night_ended_at: null });
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

                // Birbirinden bağımsız adımlar aynı anda yapılır: buton hızlı cevap verir
                const [current, track] = await Promise.all([
                    getAppState({ fresh: true }),
                    getTrackById(id).catch(() => null),
                ]);
                // Gece kapalıyken çalınan şarkı "çalındı" diye işaretlenir ve istatistiğe
                // hiçbir geceye ait olmadan yazılırdı
                if (!current.nightOpen) {
                    return NextResponse.json({ error: NIGHT_CLOSED }, { status: 409 });
                }
                await Promise.all([
                    current.nowPlaying && current.nowPlaying !== id
                        ? finishRequest(current.nowPlaying)
                        : null,
                    ensureRequest(id, track).catch((e) => console.error(e)),
                    recordPlay(id, track),
                    setNowPlaying(
                        id,
                        track ? `${track.name} · ${track.artists}` : title,
                        track?.cover ?? null
                    ),
                ]);
                break;
            }

            case "stop": {
                const current = await getAppState({ fresh: true });
                await Promise.all([
                    current.nowPlaying ? finishRequest(current.nowPlaying) : null,
                    setNowPlaying(null, null),
                ]);
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

        if (NEW_NIGHT.has(body.action)) await markNight(new Date().toISOString());
        if (FLAG_ACTIONS.has(body.action)) revalidateTag(FLAGS_TAG, { expire: 0 });

        clearAppStateCache();
        notifyLive("state", "requests");
        return NextResponse.json(await getAppState({ fresh: true }), {
            headers: NO_STORE,
        });
    } catch (e) {
        console.error(e);
        // İşlem yarıda kaldıysa durum değişmiş olabilir: dashboard ve ziyaretçiler gerçek hâli görsün
        clearAppStateCache();
        notifyLive("state", "requests");
        return NextResponse.json({ error: "İşlem yapılamadı." }, { status: 500 });
    }
}