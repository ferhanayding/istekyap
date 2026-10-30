import { getPlaylistTracks } from "@/lib/spotify";
import type { Track } from "@/lib/spotify";

type Index = { ids: Set<string>; keys: Set<string>; expires: number };
type Candidate = Pick<Track, "id" | "name" | "artists">;

// Harf ve rakam dışındaki her şeyi at: "Şarkı (Live)!" -> "şarkı live"
const NON_ALNUM = new RegExp("[^\\p{L}\\p{N}]+", "gu");
const norm = (s: string) => s.toLowerCase().replace(NON_ALNUM, " ").trim();
const keyOf = (t: Candidate) => `${norm(t.name)}|${norm(t.artists)}`;

let cache: Index | null = null;

export async function getPlaylistIndex(): Promise<Index> {
    if (cache && Date.now() < cache.expires) return cache;

    const tracks = await getPlaylistTracks();
    cache = {
        ids: new Set(tracks.map((t) => t.id)),
        keys: new Set(tracks.map(keyOf)),
        expires: Date.now() + 60_000,
    };
    return cache;
}

export function isInPlaylist(index: Index, t: Candidate): boolean {
    return index.ids.has(t.id) || index.keys.has(keyOf(t));
}