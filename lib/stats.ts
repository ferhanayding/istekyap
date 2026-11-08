import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getPlaylistTracks } from "@/lib/spotify";
import type { SongStat, Stats, StatsResponse } from "@/lib/stats-types";

// Dashboard İstatistik sekmesi. "Bu gece" = son "İstek listesini arşivle"den beri,
// "Tüm zamanlar" = arşivdekiler dahil hepsi.

type ReqRow = {
    spotify_id: string;
    name: string;
    artists: string;
    cover: string | null;
    status: string;
    request_count: number;
    created_at: string;
    last_requested_at: string | null;
    archived_at: string | null;
};
type DeviceRow = { device_id: string; created_at: string };
type PlayRow = {
    spotify_id: string;
    name: string | null;
    artists: string | null;
    cover: string | null;
    played_at: string;
};
type VoteRow = { spotify_id: string; value: number; updated_at: string };
type VoteHistRow = { spotify_id: string; likes: number; dislikes: number };
type CommentRow = { rating: number | null; created_at: string };

const PAGE = 1000;

// Supabase bir seferde en fazla 1000 satır verir: sayfa sayfa çek
async function all<T>(table: string, columns: string): Promise<T[]> {
    const out: T[] = [];
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabaseAdmin
            .from(table)
            .select(columns)
            .range(from, from + PAGE - 1);
        if (error) throw error;
        out.push(...((data ?? []) as T[]));
        if (!data || data.length < PAGE) return out;
        if (from > 50 * PAGE) return out; // emniyet
    }
}

const HOUR_FMT = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "numeric",
    hourCycle: "h23",
});
const hourOf = (iso: string) => Number(HOUR_FMT.format(new Date(iso))) % 24;

function median(nums: number[]): number | null {
    if (!nums.length) return null;
    const s = [...nums].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

type Meta = { name: string; artists: string; cover: string | null };

function compute(
    reqs: ReqRow[],
    devices: DeviceRow[],
    plays: PlayRow[],
    votes: VoteRow[],
    voteHist: VoteHistRow[],
    comments: CommentRow[],
    meta: Map<string, Meta>
): Stats {
    const songs = new Map<string, SongStat>();
    const song = (id: string): SongStat => {
        let s = songs.get(id);
        if (!s) {
            const m = meta.get(id);
            s = {
                id,
                name: m?.name ?? "Bilinmeyen şarkı",
                artists: m?.artists ?? "",
                cover: m?.cover ?? null,
                requests: 0,
                nights: 0,
                approved: 0,
                rejected: 0,
                plays: 0,
                likes: 0,
                dislikes: 0,
                firstRequested: null,
                lastRequested: null,
                lastPlayed: null,
            };
            songs.set(id, s);
        }
        return s;
    };

    const nightsBySong = new Map<string, Set<string>>();
    let approvedRows = 0;
    let rejectedRows = 0;
    for (const r of reqs) {
        const s = song(r.spotify_id);
        s.requests += r.request_count ?? 1;
        if (r.status === "approved" || r.status === "played") {
            s.approved++;
            approvedRows++;
        }
        if (r.status === "rejected") {
            s.rejected++;
            rejectedRows++;
        }
        const last = r.last_requested_at ?? r.created_at;
        if (!s.firstRequested || r.created_at < s.firstRequested) s.firstRequested = r.created_at;
        if (!s.lastRequested || last > s.lastRequested) s.lastRequested = last;
        const set = nightsBySong.get(r.spotify_id) ?? new Set();
        set.add(r.archived_at ?? "now");
        nightsBySong.set(r.spotify_id, set);
    }
    for (const [id, set] of nightsBySong) song(id).nights = set.size;

    for (const p of plays) {
        const s = song(p.spotify_id);
        s.plays++;
        if (!s.lastPlayed || p.played_at > s.lastPlayed) s.lastPlayed = p.played_at;
    }
    for (const v of votes) {
        if (v.value > 0) song(v.spotify_id).likes++;
        else if (v.value < 0) song(v.spotify_id).dislikes++;
    }
    for (const v of voteHist) {
        const s = song(v.spotify_id);
        s.likes += v.likes;
        s.dislikes += v.dislikes;
    }

    // İstek gelince kaç dakika sonra çalındı (aynı şarkının istekten sonraki ilk çalınışı)
    const playTimes = new Map<string, number[]>();
    for (const p of plays) {
        const list = playTimes.get(p.spotify_id) ?? [];
        list.push(new Date(p.played_at).getTime());
        playTimes.set(p.spotify_id, list);
    }
    for (const list of playTimes.values()) list.sort((a, b) => a - b);
    const waits: number[] = [];
    for (const r of reqs) {
        if (r.status !== "played") continue;
        const t = new Date(r.created_at).getTime();
        const at = playTimes.get(r.spotify_id)?.find((p) => p >= t);
        if (at !== undefined && at - t < 12 * 3600_000) waits.push((at - t) / 60_000);
    }

    // Saat saat istek: her istek/katılma bir olay. Eski isteklerde cihaz kaydı yoksa istek anı
    const hours = Array<number>(24).fill(0);
    if (devices.length) for (const d of devices) hours[hourOf(d.created_at)]++;
    else for (const r of reqs) hours[hourOf(r.created_at)] += r.request_count ?? 1;

    const ratings = comments.map((c) => c.rating).filter((r): r is number => !!r);
    const list = [...songs.values()];

    return {
        totalRequests: list.reduce((n, s) => n + s.requests, 0),
        requestedSongs: list.filter((s) => s.requests > 0).length,
        people: new Set(devices.map((d) => d.device_id)).size,
        approvalRate:
            approvedRows + rejectedRows > 0
                ? approvedRows / (approvedRows + rejectedRows)
                : null,
        plays: plays.length,
        likes: list.reduce((n, s) => n + s.likes, 0),
        dislikes: list.reduce((n, s) => n + s.dislikes, 0),
        medianWaitMin: median(waits),
        avgRating: ratings.length
            ? ratings.reduce((a, b) => a + b, 0) / ratings.length
            : null,
        comments: comments.length,
        hours,
        songs: list,
    };
}

// gece-baslangici.sql çalıştırılmadıysa sütun yoktur: o zaman sadece arşive bakılır
async function nightStartedAt(): Promise<string | null> {
    const { data, error } = await supabaseAdmin
        .from("app_state")
        .select("night_started_at")
        .eq("id", 1)
        .maybeSingle();
    if (error) return null;
    return (data as { night_started_at: string | null } | null)?.night_started_at ?? null;
}

export async function getStats(): Promise<StatsResponse> {
    const [reqs, devices, plays, votes, voteHist, comments, playlist] = await Promise.all([
        all<ReqRow>(
            "requests",
            "spotify_id, name, artists, cover, status, request_count, created_at, last_requested_at, archived_at"
        ),
        all<DeviceRow>("request_devices", "device_id, created_at"),
        all<PlayRow>("play_history", "spotify_id, name, artists, cover, played_at"),
        all<VoteRow>("song_votes", "spotify_id, value, updated_at"),
        all<VoteHistRow>("vote_history", "spotify_id, likes, dislikes"),
        all<CommentRow>("comments", "rating, created_at"),
        getPlaylistTracks().catch(() => []),
    ]);

    // Şarkı adı/kapağı: playlist, sonra istekler, sonra çalma geçmişi
    const meta = new Map<string, Meta>();
    for (const t of playlist) meta.set(t.id, { name: t.name, artists: t.artists, cover: t.cover });
    for (const r of reqs) meta.set(r.spotify_id, { name: r.name, artists: r.artists, cover: r.cover });
    for (const p of plays) {
        if (!meta.has(p.spotify_id) && p.name) {
            meta.set(p.spotify_id, { name: p.name, artists: p.artists ?? "", cover: p.cover });
        }
    }

    // Bu gece: son "yeni gece" butonundan (arşivle, sıfırla, kalıcı sil) sonrası
    const lastArchive = reqs.reduce<string | null>(
        (m, r) => (r.archived_at && (!m || r.archived_at > m) ? r.archived_at : m),
        null
    );
    const nightStart = await nightStartedAt();
    const startIso =
        nightStart && (!lastArchive || nightStart > lastArchive) ? nightStart : lastArchive;
    const since = startIso ? new Date(startIso).getTime() : 0;
    const after = (iso: string) => new Date(iso).getTime() > since;

    const night = compute(
        reqs.filter((r) => !r.archived_at),
        devices.filter((d) => after(d.created_at)),
        plays.filter((p) => after(p.played_at)),
        votes.filter((v) => after(v.updated_at)),
        [],
        comments.filter((c) => after(c.created_at)),
        meta
    );
    const total = compute(reqs, devices, plays, votes, voteHist, comments, meta);

    // Geçmiş geceler: her arşivleme bir gece
    const byNight = new Map<string, ReqRow[]>();
    for (const r of reqs) {
        if (!r.archived_at) continue;
        const list = byNight.get(r.archived_at) ?? [];
        list.push(r);
        byNight.set(r.archived_at, list);
    }
    const nights = [...byNight.entries()]
        .map(([archivedAt, rows]) => ({
            archivedAt,
            startedAt: rows.reduce((m, r) => (r.created_at < m ? r.created_at : m), rows[0].created_at),
            requests: rows.reduce((n, r) => n + (r.request_count ?? 1), 0),
            played: rows.filter((r) => r.status === "played").length,
            rejected: rows.filter((r) => r.status === "rejected").length,
            songs: rows
                .map((r) => ({
                    id: r.spotify_id,
                    name: r.name,
                    artists: r.artists,
                    count: r.request_count ?? 1,
                    status: r.status,
                }))
                .sort((a, b) => b.count - a.count),
        }))
        .sort((a, b) => (a.archivedAt < b.archivedAt ? 1 : -1));

    return { since: startIso, night, total, nights };
}
