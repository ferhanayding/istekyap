import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getAppState } from "@/lib/app-state";
import { notifyLive } from "@/lib/live-server";
import { getPlaylist } from "@/lib/playlist";
import { closeOpenPolls, getLatestPoll, startPoll } from "@/lib/poll";
import { POLL_MAX_OPTIONS, POLL_MIN_OPTIONS } from "@/lib/poll-types";
import { getTrackById } from "@/lib/search";

const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;
const NO_STORE = { "Cache-Control": "no-store" };
const NEED_SQL = "Önce Supabase'de supabase/yeni-ozellikler.sql dosyasını çalıştır.";

// En son anket (bitmiş olsa da): dashboard sonucu görmeye devam eder
export async function GET() {
    if (!(await requireUser())) {
        return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }
    try {
        return NextResponse.json(
            { poll: await getLatestPoll({ fresh: true }) },
            { headers: NO_STORE }
        );
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Anket alınamadı." }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!(await requireUser())) {
        return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }
    const body = await req.json().catch(() => null);

    try {
        if (body?.action === "close") {
            await closeOpenPolls();
        } else if (body?.action === "start") {
            const ids: unknown = body.ids;
            if (
                !Array.isArray(ids) ||
                ids.length < POLL_MIN_OPTIONS ||
                ids.length > POLL_MAX_OPTIONS ||
                new Set(ids).size !== ids.length ||
                !ids.every((id) => typeof id === "string" && SPOTIFY_ID.test(id))
            ) {
                return NextResponse.json(
                    { error: `Anket için ${POLL_MIN_OPTIONS}-${POLL_MAX_OPTIONS} farklı şarkı seç.` },
                    { status: 400 }
                );
            }

            const state = await getAppState({ fresh: true });
            if (!state.nightOpen) {
                return NextResponse.json(
                    { error: "Gece kapalı. Önce Sistem sekmesinden geceyi başlat." },
                    { status: 409 }
                );
            }

            // Şarkı bilgisi sunucuda bulunur: önce playlistten, yoksa Spotify'dan
            const playlist = await getPlaylist()
                .then((p) => p.tracks)
                .catch(() => []);
            const byId = new Map(playlist.map((t) => [t.id, t]));
            const options = [];
            for (const id of ids as string[]) {
                const t = byId.get(id) ?? (await getTrackById(id).catch(() => null));
                if (!t) {
                    return NextResponse.json({ error: "Şarkı bulunamadı." }, { status: 404 });
                }
                options.push({ id: t.id, name: t.name, artists: t.artists, cover: t.cover });
            }

            const { missing } = await startPoll(options);
            if (missing) return NextResponse.json({ error: NEED_SQL }, { status: 409 });
        } else {
            return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
        }

        notifyLive("poll");
        return NextResponse.json(
            { poll: await getLatestPoll({ fresh: true }) },
            { headers: NO_STORE }
        );
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "İşlem yapılamadı." }, { status: 500 });
    }
}
