import { NextRequest, NextResponse } from "next/server";
import { getIp, limitDeviceAndIp } from "@/lib/rate-limit";
import { getOrCreateDeviceId } from "@/lib/device";
import { getTrackById } from "@/lib/search";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAppState } from "@/lib/app-state";
import { notifyLive } from "@/lib/live-server";
import { isBlocked, isBlockedComment } from "@/lib/blocklist";
import { hasRequestableLength } from "@/lib/spotify";
import { getPlaylistIndex, isInPlaylist } from "@/lib/playlist-index";
import { MAX_REQUEST_LIMIT, MAX_REQUEST_WINDOW_MIN } from "@/lib/request-limit";
import { readAtHeader } from "@/lib/fresh";
import { MAX_REQUEST_NOTE, cleanNote, hasLink } from "@/lib/visitor-types";
import { fold } from "@/lib/fold";
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

// Özel istek: bu sanatçıların şarkıları (ortak şarkılar dahil) istenemez, yerine şaka mesajı çıkar.
// Aramada görünmeye devam eder. Spotify'da "Ferhan Aydin" yazıyor; büyük/küçük harf ve ı/i farkı önemsiz.
const NO_REQUEST_ARTISTS = new Set(["ferhan aydin"]);
const NO_REQUEST_MESSAGE = "Sen sinemalara git bizsiz.";
const hasNoRequestArtist = (artists: string) =>
    artists.split(",").some((a) => NO_REQUEST_ARTISTS.has(fold(a).trim()));

// İsteğe eklenen not: boşsa null; uygunsuzsa ziyaretçiye gösterilecek hata
function readNote(raw: unknown): { note: string | null } | { error: string } {
    if (raw === undefined || raw === null) return { note: null };
    if (typeof raw !== "string") return { error: "Geçersiz istek." };
    const note = cleanNote(raw);
    if (!note) return { note: null };
    if (note.length > MAX_REQUEST_NOTE) {
        return { error: `Not en fazla ${MAX_REQUEST_NOTE} karakter olabilir.` };
    }
    if (isBlockedComment(note)) return { error: "Notunda uygunsuz bir kelime var." };
    if (hasLink(note)) return { error: "Nota link eklenemez." };
    return { note };
}

// Not, bu cihazın o istekteki kaydına yazılır (aynı şarkıyı isteyen herkesin notu ayrı).
// istek-notu.sql çalıştırılmadıysa yazılamaz: istek yine de geçerli, hata sadece loglanır.
async function saveNote(spotifyId: string, deviceId: string, note: string) {
    const { data, error } = await supabaseAdmin
        .from("requests")
        .select("id")
        .eq("spotify_id", spotifyId)
        .is("archived_at", null)
        .in("status", ["pending", "approved", "rejected"])
        .limit(1)
        .maybeSingle();
    if (error || !data) {
        if (error) console.error(error);
        return;
    }
    const { error: noteError } = await supabaseAdmin
        .from("request_devices")
        .update({ note })
        .eq("request_id", data.id)
        .eq("device_id", deviceId);
    if (noteError) console.error(noteError);
}

// Kötüye kullanım emniyeti (bellekte, her denemeyi sayar): 10 dakikalık pencere
const ATTEMPT_WINDOW_MS = 10 * 60_000;

// Sınıra gelince toast'ta görünen mesaj
function limitMessage(limit: number, windowMin: number, retryAfterSec: number): string {
    const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
    return `${windowMin} dakikada ${limit} istek hakkın var, hepsini kullandın. ${minutes} dk sonra tekrar isteyebilirsin.`;
}

// Bu cihazın en uzun pencerede (dashboard'dan ayarlanabilen üst sınır) yaptığı istek ve
// katılmalar, yeniden eskiye. Asıl pencere çağıran tarafta uygulanır: ayar durumla aynı anda okunur.
async function recentRequestTimes(deviceId: string): Promise<number[]> {
    const { data, error } = await supabaseAdmin
        .from("request_devices")
        .select("created_at")
        .eq("device_id", deviceId)
        .gte(
            "created_at",
            new Date(Date.now() - MAX_REQUEST_WINDOW_MIN * 60_000).toISOString()
        )
        .order("created_at", { ascending: false })
        .limit(MAX_REQUEST_LIMIT);
    if (error) throw error;
    return (data ?? []).map((r) => new Date(r.created_at).getTime());
}

// Bu gece istenemeyecek şarkı: çalınmış (dashboard'da "Çal"/"Çalındı") ya da reddedilmiş.
// Önceden bakılır ki sayaç artmasın ve kişinin istek hakkı boşa gitmesin.
// Gece başlatılınca ikisi de sıfırlanır.
async function blockedTonight(
    spotifyId: string,
    played: string[]
): Promise<"played" | "rejected" | null> {
    if (played.includes(spotifyId)) return "played";
    const { data, error } = await supabaseAdmin
        .from("requests")
        .select("status")
        .eq("spotify_id", spotifyId)
        .is("archived_at", null)
        .in("status", ["played", "rejected"]);
    if (error) throw error;
    if (data?.some((r) => r.status === "played")) return "played";
    return data?.length ? "rejected" : null;
}

type MakeResult =
    | { result: "created" | "joined" | "already"; status: string; count: number }
    // Sadece make_request_limited döndürür: sınır veritabanında, kilit altında sayıldı
    | { result: "limited"; retry_after: number };

type MakeArgs = {
    p_spotify_id: string;
    p_name: string;
    p_artists: string;
    p_cover: string | null;
    p_device: string;
};

// istek-kilidi.sql çalıştırılmadıysa make_request_limited yoktur: bir süre hiç denenmez
let noLimitedUntil = 0;

// Yeni istek ya da aynı şarkıyı isteyenlere katılma (sayaç cihaz başına bir artar).
// Sınır veritabanında, cihaza özel kilit altında bir kez daha sayılır: yukarıdaki ön kontrolle
// kayıt arasına aynı cihazdan ikinci bir istek sığamaz (aynı anda iki dokunuş, iki sekme).
async function makeRequest(
    args: MakeArgs,
    limit: number,
    windowSec: number
): Promise<MakeResult> {
    if (Date.now() > noLimitedUntil) {
        const { data, error } = await supabaseAdmin.rpc("make_request_limited", {
            ...args,
            p_limit: limit,
            p_window_sec: windowSec,
        });
        if (!error) return data as MakeResult;
        // PGRST202 / 42883: fonksiyon yok. Eski yola düş, 5 dakika sonra yine dene.
        if (error.code !== "PGRST202" && error.code !== "42883") throw error;
        noLimitedUntil = Date.now() + 5 * 60_000;
    }
    const { data, error } = await supabaseAdmin.rpc("make_request", args);
    if (error) throw error;
    return data as MakeResult;
}

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
    const [state, allRecent, body] = await Promise.all([
        getAppState().catch(() => null),
        // Bellekteki sayaç Vercel'de her sunucu örneğinde ayrı tutulur ve yeniden başlayınca
        // sıfırlanır. Asıl sınır veritabanından: bu cihazın son istekleri.
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

    // Sınır dashboard'dan ayarlanır (Sistem sekmesi): "kaç dakikada kaç istek"
    const deviceLimit = state.requestLimit;
    const windowMs = state.requestWindowMin * 60_000;
    const recent = allRecent.filter((t) => t > Date.now() - windowMs);

    // Bellekteki sayaç her denemeyi sayar (başarısızlar dahil), o yüzden sadece kötüye
    // kullanıma karşı geniş bir emniyet: cihaz başına 10 dakikada en az 30 deneme (ayarlanan
    // sınır yüksekse onun 3 katı), aynı IP'den (ortak Wi-Fi) 10 katı. Asıl kural aşağıda,
    // gerçekleşen isteklerden sayılır.
    const perTenMin = Math.ceil((deviceLimit * ATTEMPT_WINDOW_MS) / windowMs);
    const attempts = Math.max(30, perTenMin * 3);
    const limit = limitDeviceAndIp(
        "request",
        deviceId,
        getIp(req),
        { limit: attempts, windowMs: ATTEMPT_WINDOW_MS },
        { limit: attempts * 10, windowMs: ATTEMPT_WINDOW_MS }
    );
    if (!limit.ok) {
        return NextResponse.json(
            { error: "Çok fazla deneme yaptın, biraz bekle." },
            { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
        );
    }
    if (recent.length >= deviceLimit) {
        // Hak, penceredeki en eski sayılan istek pencereden çıkınca açılır
        const oldest = recent[deviceLimit - 1];
        const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - Date.now()) / 1000));
        return NextResponse.json(
            { error: limitMessage(deviceLimit, state.requestWindowMin, retryAfter) },
            { status: 429, headers: { "Retry-After": String(retryAfter) } }
        );
    }

    const id = body?.id;
    if (typeof id !== "string" || !SPOTIFY_ID.test(id)) {
        return NextResponse.json({ error: "Geçersiz şarkı." }, { status: 400 });
    }
    // Not istekten önce denetlenir: uygunsuz not yüzünden istek hakkı harcanmasın
    const noteResult = readNote(body?.note);
    if ("error" in noteResult) {
        return NextResponse.json({ error: noteResult.error }, { status: 400 });
    }
    const { note } = noteResult;

    try {
        // Şarkı ve playlist aynı anda (playlist önbellekte, çoğu zaman anında gelir)
        const [track, index] = await Promise.all([
            getTrackById(id),
            getPlaylistIndex().catch(() => null),
        ]);
        if (!track) {
            return NextResponse.json({ error: "Şarkı bulunamadı." }, { status: 404 });
        }
        // İstek hakkı harcanmadan, diğer kontrollerden önce
        if (hasNoRequestArtist(track.artists)) {
            return NextResponse.json({ error: NO_REQUEST_MESSAGE }, { status: 403 });
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

        const blocked = await blockedTonight(track.id, state.played);
        if (blocked) {
            return NextResponse.json(
                {
                    error:
                        blocked === "played"
                            ? "Bu şarkı bu gece zaten çalındı."
                            : "Bu şarkı repertuvarımızda yok.",
                },
                { status: 409 }
            );
        }

        const r = await makeRequest(
            {
                p_spotify_id: track.id,
                p_name: track.name,
                p_artists: track.artists,
                p_cover: track.cover,
                p_device: deviceId,
            },
            deviceLimit,
            state.requestWindowMin * 60
        );

        // Ön kontrolden sonra aynı cihazdan başka bir istek araya girdi
        if (r.result === "limited") {
            return NextResponse.json(
                { error: limitMessage(deviceLimit, state.requestWindowMin, r.retry_after) },
                { status: 429, headers: { "Retry-After": String(r.retry_after) } }
            );
        }

        if (r.result !== "already") {
            // Not önce yazılır: dashboard canlı sinyalle listeyi çekince notu da görsün
            if (note && r.status !== "rejected") {
                await saveNote(track.id, deviceId, note).catch((e) => console.error(e));
            }
            notifyLive("requests");
        }

        // Kontrolle istek arasında reddedildiyse (çok dar bir an)
        if (r.status === "rejected") {
            return NextResponse.json(
                { error: "Bu şarkı repertuvarımızda yok.", count: r.count },
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
    // Sorgudan önceki an: telefon daha eski bir önbellek kopyasını bunun üstüne yazmaz (lib/fresh)
    const readAt = Date.now();
    const { data, error } = await supabaseAdmin
        .from("requests")
        .select("id, spotify_id, name, artists, cover, status, request_count, created_at, last_requested_at")
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(300);

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
            ...readAtHeader(readAt),
        },
    });
}
