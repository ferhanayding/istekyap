import "server-only";

export type Track = {
    id: string;
    name: string;
    artists: string;
    album: string;
    cover: string | null;
    url: string;
    addedAt?: string | null | undefined;
    /** Spotify'ın "müstehcen" etiketi (sadece arama / tek şarkı sorgusunda dolu) */
    explicit?: boolean;
};

type SpotifyTrack = {
    id: string;
    name: string;
    type: string;
    artists: { name: string }[];
    album: { name: string; images?: { url: string }[] };
    external_urls: { spotify: string };
    added_at?: string | null | undefined;
};
type PlaylistPage = {
    items?: {
        added_at?: string | null;
        item?: SpotifyTrack | null;
        track?: SpotifyTrack | null;
    }[];
    next: string | null;
};

// Spotify bir çağrıda takılırsa fonksiyon dakikalarca beklemesin
const TIMEOUT_MS = 8000;

// Token 1 saat geçerli: 50 dakika saklanır, aynı anda gelen istekler tek token isteğini paylaşır
let token: { value: string; expires: number } | null = null;
let tokenRequest: Promise<string> | null = null;

async function requestToken(): Promise<string> {
    const basic = Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            Authorization: `Basic ${basic}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: process.env.SPOTIFY_REFRESH_TOKEN!,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
        throw new Error(`Token alınamadı: ${res.status} ${await res.text()}`);
    }
    return (await res.json()).access_token;
}

export async function getAccessToken(): Promise<string> {
    if (token && Date.now() < token.expires) return token.value;
    tokenRequest ??= requestToken()
        .then((value) => {
            token = { value, expires: Date.now() + 50 * 60_000 };
            return value;
        })
        .finally(() => {
            tokenRequest = null;
        });
    return tokenRequest;
}

// Spotify API çağrısı: token süresi dolmuşsa (401) bir kez yenileyip tekrar dener,
// geçici hatada (429 / 5xx / zaman aşımı) kısa bir beklemeyle bir kez daha dener
export async function spotifyFetch(url: string): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
        let res: Response;
        try {
            res = await fetch(url, {
                headers: { Authorization: `Bearer ${await getAccessToken()}` },
                cache: "no-store",
                signal: AbortSignal.timeout(TIMEOUT_MS),
            });
        } catch (e) {
            if (attempt >= 1) throw e;
            await new Promise((r) => setTimeout(r, 400));
            continue;
        }

        if (res.status === 401 && attempt === 0) {
            token = null;
            continue;
        }
        if ((res.status === 429 || res.status >= 500) && attempt === 0) {
            const wait = Number(res.headers.get("retry-after")) || 0.5;
            await new Promise((r) => setTimeout(r, Math.min(wait, 3) * 1000));
            continue;
        }
        return res;
    }
}

export async function getPlaylistTracks(): Promise<Track[]> {
    const tracks: Track[] = [];
    let url: string | null =
        `https://api.spotify.com/v1/playlists/${process.env.SPOTIFY_PLAYLIST_ID}/items?limit=50`;

    while (url) {
        const res: Response = await spotifyFetch(url);
        if (!res.ok) {
            throw new Error(`Playlist alınamadı: ${res.status} ${await res.text()}`);
        }
        const page: PlaylistPage = await res.json();

        for (const entry of page.items ?? []) {
            // Şubat 2026'da "track" alanı "item" oldu; ikisini de destekleyelim
            const t = entry.item ?? entry.track;
            if (!t || t.type !== "track") continue; // silinmiş veya podcast bölümü olanları atla

            tracks.push({
                id: t.id,
                name: t.name,
                artists: t.artists.map((a) => a.name).join(", "),
                album: t.album.name,
                cover: t.album.images?.[1]?.url ?? t.album.images?.[0]?.url ?? null,
                url: t.external_urls.spotify,
                addedAt: entry.added_at ?? null,
            });
        }
        url = page.next;
    }

    return tracks;
}
