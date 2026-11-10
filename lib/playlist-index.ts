import "server-only";
import { getPlaylist } from "@/lib/playlist";
import type { Track } from "@/lib/spotify";

type Index = { ids: Set<string>; keys: Set<string> };
type Candidate = Pick<Track, "id" | "name" | "artists">;

// Harf ve rakam dışındaki her şeyi at: "Şarkı (Live)!" -> "şarkı live"
const NON_ALNUM = new RegExp("[^\\p{L}\\p{N}]+", "gu");
const norm = (s: string) => s.toLowerCase().replace(NON_ALNUM, " ").trim();
const keyOf = (t: Candidate) => `${norm(t.name)}|${norm(t.artists)}`;

// Aynı playlist için index bir kez kurulur
let built: { fetchedAt: number; index: Index } | null = null;

export async function getPlaylistIndex(): Promise<Index> {
    const { tracks, fetchedAt } = await getPlaylist();
    if (built?.fetchedAt === fetchedAt) return built.index;

    const index: Index = {
        ids: new Set(tracks.map((t) => t.id)),
        keys: new Set(tracks.map(keyOf)),
    };
    built = { fetchedAt, index };
    return index;
}

export function isInPlaylist(index: Index, t: Candidate): boolean {
    return index.ids.has(t.id) || index.keys.has(keyOf(t));
}
