import { NextRequest, NextResponse } from "next/server";
import { getIp, limitDeviceAndIp } from "@/lib/rate-limit";
import { getOrCreateDeviceId } from "@/lib/device";
import { getTrackById } from "@/lib/search";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAppState } from "@/lib/app-state";
import { notifyLive } from "@/lib/live-server";
import { isBlocked } from "@/lib/blocklist";
import { hasRequestableLength } from "@/lib/spotify";
import { getPlaylistIndex, isInPlaylist } from "@/lib/playlist-index";
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

const DEVICE_LIMIT = 5;
const DEVICE_WINDOW_MS = 10 * 60_000;

// Sınıra gelince toast'ta görünen mesaj
function limitMessage(retryAfterSec: number): string {
    const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
    return `10 dakikada ${DEVICE_LIMIT} istek hakkın var, hepsini kullandın. ${minutes} dk sonra tekrar isteyebilirsin.`;
}

// Bu cihazın son 10 dakikada yaptığı istek ve katılmalar (request_devices'tan)
async function recentRequestTimes(deviceId: string): Promise<number[]> {
    const { data, error } = await supabaseAdmin
        .from("request_devices")
        .select("created_at")
        .eq("device_id", deviceId)
        .gte("created_at", new Date(Date.now() - DEVICE_WINDOW_MS).toISOString())
        .limit(DEVICE_LIMIT);
    if (error) throw error;
    return (data ?? []).map((r) => new Date(r.created_at).getTime());
}

// Bu gece çalındı mı: "Çal"/"Çalındı" ile bu gecenin çalınanlar listesine girenler ya da
// listede "Çalındı" olan istekler. Gece başlatılınca liste sıfırlanır.
async function playedTonight(spotifyId: string, played: string[]): Promise<boolean> {
    if (played.includes(spotifyId)) return true;
    const { data, error } = await supabaseAdmin
        .from("requests")
        .select("id")
        .eq("spotify_id", spotifyId)
        .is("archived_at", null)
        .eq("status", "played")
        .limit(1);
    if (error) throw error;
    return (data?.length ?? 0) > 0;
}

type MakeResult = {
    result: "created" | "joined" | "already";
    status: string;
    count: number;
};

// Listede önce onaylılar, sonra bekleyenler, sonra çalınanlar, en altta reddedilenler
const RANK: Record<string, number> = {
    approved: 0,
    pending: 1,
    played: 2,
    rejected: 3,
};

export async function POST(req: NextRequest) {
    const deviceId = await getOrCreateDeviceId();

    // Durum, bu cihazın son istekleri ve gövde aynı anda okunur (sırayla beklemek yerine)
    const [state, recent, body] = await Promise.all([
        getAppState().catch(() => null),
        // Bellekteki sayaç Vercel'de her sunucu örneğinde ayrı tutulur ve yeniden başlayınca
        // sıfırlanır. Asıl sınır veritabanından: bu cihazın son 10 dakikadaki istekleri.
        recentRequestTimes(deviceId).catch((e) => {
            console.error(e);
            return [] as number[];
        }),
        req.json().catch(() => null),
    ]);

    if (!state?.requestsOpen) {
        return NextResponse.json(
            { error: "İstekler şu an kapalı." },
            { status: 403 }
        );
    }

    // Cihaz başına 10 dakikada 5 istek, aynı IP'den (ortak Wi-Fi) 10 dakikada 100
    const limit = limitDeviceAndIp(
        "request",
        deviceId,
        getIp(req),
        { limit: DEVICE_LIMIT, windowMs: DEVICE_WINDOW_MS },
        { limit: 100, windowMs: DEVICE_WINDOW_MS }
    );
    if (!limit.ok) {
        return NextResponse.json(
            { error: limitMessage(limit.retryAfter) },
            { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
        );
    }
    if (recent.length >= DEVICE_LIMIT) {
        const retryAfter = Math.max(
            1,
            Math.ceil((Math.min(...recent) + DEVICE_WINDOW_MS - Date.now()) / 1000)
        );
        return NextResponse.json(
            { error: limitMessage(retryAfter) },
            { status: 429, headers: { "Retry-After": String(retryAfter) } }
        );
    }

    const id = body?.id;
    if (typeof id !== "string" || !SPOTIFY_ID.test(id)) {
        return NextResponse.json({ error: "Geçersiz şarkı." }, { status: 400 });
    }

    try {
        // Şarkı ve playlist aynı anda (playlist önbellekte, çoğu zaman anında gelir)
        const [track, index] = await Promise.all([
            getTrackById(id),
            getPlaylistIndex().catch(() => null),
        ]);
        if (!track) {
            return NextResponse.json({ error: "Şarkı bulunamadı." }, { status: 404 });
        }
        // Aramada gizlenen şarkı doğrudan ID ile de istenemesin
        const ours = !!index && isInPlaylist(index, track);
        const explicitBlocked = track.explicit && !ours;
        const lengthBlocked = !ours && !hasRequestableLength(track);
        if (explicitBlocked || lengthBlocked || isBlocked(`${track.name} ${track.artists}`)) {
            return NextResponse.json(
                { error: "Bu şarkı istek listesine eklenemez." },
                { status: 403 }
            );
        }

        // Bu gece çalınmış şarkı tekrar istenemez
        if (await playedTonight(track.id, state.played)) {
            return NextResponse.json(
                { error: "Bu şarkı bu gece zaten çalındı." },
                { status: 409 }
            );
        }

        // Yeni istek ya da aynı şarkıyı isteyenlere katılma (sayaç cihaz başına bir artar)
        const { data, error } = await supabaseAdmin.rpc("make_request", {
            p_spotify_id: track.id,
            p_name: track.name,
            p_artists: track.artists,
            p_cover: track.cover,
            p_device: deviceId,
        });
        if (error) throw error;
        const r = data as MakeResult;

        if (r.result !== "already") notifyLive("requests");

        if (r.status === "rejected") {
            return NextResponse.json(
                { error: "Bu şarkı istendi ama reddedildi.", count: r.count },
                { status: 409 }
            );
        }
        if (r.result === "already") {
            return NextResponse.json(
                { error: "Bu şarkıyı zaten istedin.", count: r.count },
                { status: 409 }
            );
        }
        return NextResponse.json(
            { ok: true, joined: r.result === "joined", status: r.status, count: r.count },
            { status: r.result === "created" ? 201 : 200 }
        );
    } catch (e) {
        console.error(e);
        return NextResponse.json(
            { error: "İstek gönderilemedi. Tekrar dene." },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    const { data, error } = await supabaseAdmin
        .from("requests")
        .select("id, spotify_id, name, artists, cover, status, request_count, created_at, last_requested_at")
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) {
        console.error(error);
        return NextResponse.json({ error: "Liste alınamadı." }, { status: 500 });
    }

    // Aynı durumdakilerde çok istenen üstte; sort kararlı, eşitler yeniden eskiye kalır
    const sorted = [...(data ?? [])].sort(
        (a, b) =>
            (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9) ||
            (b.request_count ?? 1) - (a.request_count ?? 1)
    );

    // Vercel birkaç saniye herkese aynı cevabı verir, veritabanı yorulmaz.
    // ?v= (canlı sinyal sürümü) ile gelenler o sinyale ait: herkes aynı cevabı alır.
    const v = req.nextUrl.searchParams.has("v");
    return NextResponse.json(sorted, {
        headers: {
            "Cache-Control": v
                ? "public, s-maxage=30"
                : "public, s-maxage=5",
        },
    });
}
