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

export async function getAccessToken(): Promise<string> {
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
    });

    if (!res.ok) {
        throw new Error(`Token alınamadı: ${res.status} ${await res.text()}`);
    }
    return (await res.json()).access_token;
}

export async function getPlaylistTracks(): Promise<Track[]> {


    const token = await getAccessToken();
    const tracks: Track[] = [];
    let url: string | null =
        `https://api.spotify.com/v1/playlists/${process.env.SPOTIFY_PLAYLIST_ID}/items?limit=50`;

    while (url) {
        const res: Response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
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