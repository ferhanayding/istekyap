import { NextRequest, NextResponse } from "next/server";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { getOrCreateDeviceId, readDeviceId } from "@/lib/device";
import { getAppState } from "@/lib/app-state";
import { getPlaylistIndex } from "@/lib/playlist-index";
import { clearLikeCountsCache, getLikeCounts } from "@/lib/votes";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

export async function GET() {
    try {
        const out: Record<string, { likes: number; mine: number }> = {};

        // Toplam beğeniler ve bu cihazın kendi oyları aynı anda okunur
        const deviceId = await readDeviceId();
        const [counts, mine] = await Promise.all([
            getLikeCounts(),
            deviceId
                ? supabaseAdmin
                    .from("song_votes")
                    .select("spotify_id, value")
                    .eq("device_id", deviceId)
                    .then(({ data, error }) => {
                        if (error) throw error;
                        return data ?? [];
                    })
                : Promise.resolve([]),
        ]);

        for (const c of counts) {
            out[c.spotify_id] = { likes: c.likes, mine: 0 };
        }
        for (const v of mine) {
            const id = String(v.spotify_id);
            out[id] = { likes: out[id]?.likes ?? 0, mine: Number(v.value) };
        }

        return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Oylar alınamadı." }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    // Ortak Wi-Fi'de herkes aynı IP'yi kullanır, o yüzden IP sınırı geniş
    const ipLimit = rateLimit(`vote-ip:${getIp(req)}`, 300, 60_000);
    if (!ipLimit.ok) {
        return NextResponse.json({ error: "Çok fazla işlem." }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const id = body?.id;
    const value = body?.value;
    if (
        typeof id !== "string" ||
        !SPOTIFY_ID.test(id) ||
        (value !== 1 && value !== -1 && value !== 0)
    ) {
        return NextResponse.json({ error: "Geçersiz oy." }, { status: 400 });
    }

    try {
        const deviceId = await getOrCreateDeviceId();

        const deviceLimit = rateLimit(`vote-dev:${deviceId}`, 30, 60_000);
        if (!deviceLimit.ok) {
            return NextResponse.json(
                { error: "Çok hızlı oy veriyorsun, biraz bekle." },
                { status: 429 }
            );
        }

        // Durum ve playlist aynı anda (ikisi de çoğu zaman önbellekten gelir)
        const [state, index] = await Promise.all([
            getAppState(),
            getPlaylistIndex().catch(() => null),
        ]);
        if (!state.votingOpen) {
            return NextResponse.json(
                { error: "Oylama şu an kapalı." },
                { status: 403 }
            );
        }

        if (!index) {
            return NextResponse.json(
                { error: "Şu an oy verilemiyor." },
                { status: 503 }
            );
        }

        // Oy verilebilen şarkı: playlistte olan ya da istek listesinde onaylı/çalınmış olan
        let played: boolean;
        if (index.ids.has(id)) {
            played = state.played.includes(id);
        } else {
            const { data: row, error } = await supabaseAdmin
                .from("requests")
                .select("status")
                .eq("spotify_id", id)
                .in("status", ["approved", "played"])
                .limit(1)
                .maybeSingle();
            if (error) throw error;
            if (!row) {
                return NextResponse.json(
                    { error: "Bu şarkıya oy verilemez." },
                    { status: 404 }
                );
            }
            played = row.status === "played" || state.played.includes(id);
        }

        if (!played) {
            return NextResponse.json(
                { error: "Bu şarkı henüz çalınmadı. Çalınca oy verebilirsin." },
                { status: 403 }
            );
        }

        if (value === 0) {
            const { error } = await supabaseAdmin
                .from("song_votes")
                .delete()
                .eq("spotify_id", id)
                .eq("device_id", deviceId);
            if (error) throw error;
        } else {
            const { error } = await supabaseAdmin.from("song_votes").upsert(
                {
                    spotify_id: id,
                    device_id: deviceId,
                    value,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "spotify_id,device_id" }
            );
            if (error) throw error;
        }

        clearLikeCountsCache();
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json(
            { error: "Oy gönderilemedi. Tekrar dene." },
            { status: 500 }
        );
    }
}