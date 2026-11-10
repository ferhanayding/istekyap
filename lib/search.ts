import "server-only";
import { spotifyFetch, type Track } from "@/lib/spotify";

type SearchItem = {
    id: string;
    name: string;
    artists: { name: string }[];
    album: { name: string; images?: { url: string }[] };
    external_urls: { spotify: string };
    explicit?: boolean;
};

type SearchResponse = { tracks?: { items: (SearchItem | null)[] } };

function toTrack(t: SearchItem): Track {
    return {
        id: t.id,
        name: t.name,
        artists: t.artists.map((a) => a.name).join(", "),
        album: t.album.name,
        cover: t.album.images?.[2]?.url ?? t.album.images?.[0]?.url ?? null,
        url: t.external_urls.spotify,
        explicit: t.explicit === true,
    };
}

// Aynı aramayı 10 dk boyunca Spotify'a tekrar sorma
const resultCache = new Map<string, { items: Track[]; expires: number }>();
const CACHE_MS = 10 * 60 * 1000;

export async function searchTracks(query: string): Promise<Track[]> {
    const key = query.toLocaleLowerCase("tr");
    const hit = resultCache.get(key);
    if (hit && Date.now() < hit.expires) return hit.items;

    const params = new URLSearchParams({
        q: query,
        type: "track",
        limit: "10", // Şubat 2026'dan beri en fazla 10
        market: "TR",
    });

    const res = await spotifyFetch(`https://api.spotify.com/v1/search?${params}`);
    if (!res.ok) {
        throw new Error(`Arama başarısız: ${res.status} ${await res.text()}`);
    }

    const data: SearchResponse = await res.json();
    const items = (data.tracks?.items ?? [])
        .filter((t): t is SearchItem => t !== null)
        .map(toTrack);

    if (resultCache.size >= 500) resultCache.clear();
    resultCache.set(key, { items, expires: Date.now() + CACHE_MS });
    return items;
}

// İstek gelince şarkıyı Spotify'dan doğrula (tarayıcının yolladığına güvenme).
// Aynı şarkı kısa sürede tekrar sorulursa (çok kişi aynı şarkıyı isterse) Spotify'a gidilmez.
const trackCache = new Map<string, { track: Track | null; expires: number }>();

export async function getTrackById(id: string): Promise<Track | null> {
    const hit = trackCache.get(id);
    if (hit && Date.now() < hit.expires) return hit.track;

    const res = await spotifyFetch(`https://api.spotify.com/v1/tracks/${id}?market=TR`);
    if (res.status === 400 || res.status === 404) return null;
    if (!res.ok) {
        throw new Error(`Şarkı alınamadı: ${res.status} ${await res.text()}`);
    }
    const track = toTrack(await res.json());

    if (trackCache.size >= 1000) trackCache.clear();
    trackCache.set(id, { track, expires: Date.now() + 60 * 60_000 });
    return track;
}
