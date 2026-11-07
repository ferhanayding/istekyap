import "server-only";
import { getPlaylistTracks, type Track } from "@/lib/spotify";

// Playlist 60 saniye bellekte durur, Spotify'a her aramada gidilmez
let cache: { tracks: Track[]; expires: number } | null = null;
let inflight: Promise<Track[]> | null = null;

export async function getCachedPlaylist(): Promise<Track[]> {
  if (cache && Date.now() < cache.expires) return cache.tracks;

  // Aynı anda gelen istekler tek Spotify çağrısını paylaşır
  const request: Promise<Track[]> =
    inflight ??
    getPlaylistTracks()
      .then((tracks) => {
        cache = { tracks, expires: Date.now() + 60_000 };
        return tracks;
      })
      .finally(() => {
        inflight = null;
      });
  inflight = request;
  return request;
}
