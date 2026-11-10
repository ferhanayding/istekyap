import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getPlaylistTracks, type Track } from "@/lib/spotify";

export const PLAYLIST_TAG = "playlist";

export type Playlist = { tracks: Track[]; fetchedAt: number };

// Playlist ana sayfanın hazır HTML'ine gömülür: ziyaretçi açtığında Spotify beklenmez.
// Trafik varken en geç 2 dakikada bir arka planda tazelenir; Spotify o an hata verirse
// eski liste gösterilmeye devam eder. Sunucudaki herkes (arama, oy, istatistik) bunu kullanır.
export async function getPlaylist(): Promise<Playlist> {
    "use cache";
    cacheLife({ stale: 300, revalidate: 120, expire: 7 * 24 * 60 * 60 });
    cacheTag(PLAYLIST_TAG);

    const tracks = await getPlaylistTracks();
    return { tracks, fetchedAt: Date.now() };
}
