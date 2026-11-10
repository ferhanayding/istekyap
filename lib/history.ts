import type { HistorySong } from "./history-types";

// "Eski istekler" hesabı (veritabanından bağımsız, test edilebilsin diye ayrı)

export type ReqRow = {
    spotify_id: string;
    name: string;
    artists: string;
    cover: string | null;
    status: string;
    request_count: number | null;
    created_at: string;
    last_requested_at: string | null;
};

export function aggregate(
    reqs: ReqRow[],
    plays: { spotify_id: string }[],
    voteHist: { spotify_id: string; likes: number }[],
    votes: { spotify_id: string; value: number }[]
): HistorySong[] {
    const songs = new Map<string, HistorySong>();
    for (const r of reqs) {
        // Reddedilen istekler ziyaretçiye hiç gösterilmez
        if (r.status === "rejected") continue;
        const last = r.last_requested_at ?? r.created_at;
        const s = songs.get(r.spotify_id);
        if (!s) {
            songs.set(r.spotify_id, {
                spotify_id: r.spotify_id,
                name: r.name,
                artists: r.artists,
                cover: r.cover,
                requests: r.request_count ?? 1,
                plays: 0,
                likes: 0,
                lastRequested: last,
            });
            continue;
        }
        s.requests += r.request_count ?? 1;
        if (last > s.lastRequested) {
            s.lastRequested = last;
            // En son isteğin adı/kapağı kullanılır
            s.name = r.name;
            s.artists = r.artists;
            s.cover = r.cover ?? s.cover;
        }
    }

    for (const p of plays) {
        const s = songs.get(p.spotify_id);
        if (s) s.plays++;
    }
    for (const v of voteHist) {
        const s = songs.get(v.spotify_id);
        if (s) s.likes += Number(v.likes) || 0;
    }
    for (const v of votes) {
        const s = songs.get(v.spotify_id);
        if (s && v.value > 0) s.likes++;
    }

    return [...songs.values()];
}
