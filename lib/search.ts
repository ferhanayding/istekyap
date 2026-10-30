import { getAccessToken } from "@/lib/spotify";
import type { Track } from "@/lib/spotify";

type SearchItem = {
    id: string;
    name: string;
    artists: { name: string }[];
    album: { name: string; images?: { url: string }[] };
    external_urls: { spotify: string };
};

type SearchResponse = { tracks?: { items: (SearchItem | null)[] } };

// Token'ı ~50 dk sakla
let cached: { token: string; expires: number } | null = null;

async function getToken(): Promise<string> {
    if (cached && Date.now() < cached.expires) return cached.token;
    const token = await getAccessToken();
    cached = { token, expires: Date.now() + 50 * 60 * 1000 };
    return token;
}

// Aynı aramayı 10 dk boyunca Spotify'a tekrar sorma
const resultCache = new Map<string, { items: Track[]; expires: number }>();
const CACHE_MS = 10 * 60 * 1000;

export async function searchTracks(query: string): Promise<Track[]> {
    const key = query.toLowerCase();
    const hit = resultCache.get(key);
    if (hit && Date.now() < hit.expires) return hit.items;

    const params = new URLSearchParams({
        q: query,
        type: "track",
        limit: "10",
        market: "TR",
    });

    const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
        headers: { Authorization: `Bearer ${await getToken()}` },
        cache: "no-store",
    });

    if (res.status === 401) cached = null;
    if (!res.ok) {
        throw new Error(`Arama başarısız: ${res.status} ${await res.text()}`);
    }

    const data: SearchResponse = await res.json();

    const items = (data.tracks?.items ?? [])
        .filter((t): t is SearchItem => t !== null)
        .map((t) => ({
            id: t.id,
            name: t.name,
            artists: t.artists.map((a) => a.name).join(", "),
            album: t.album.name,
            cover: t.album.images?.[2]?.url ?? t.album.images?.[0]?.url ?? null,
            url: t.external_urls.spotify,
        }));

    if (resultCache.size >= 500) resultCache.clear();
    resultCache.set(key, { items, expires: Date.now() + CACHE_MS });
    return items;
}