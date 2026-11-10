import { Suspense } from "react";
import { getPlaylist } from "@/lib/playlist";
import PlaylistPanel from "./PlaylistPanel";
import LoadingTracks from "./LoadingTracks";

async function PlaylistData() {
    // Spotify geçici olarak cevap vermezse sayfa çökmesin, kısa bir mesaj görünsün
    const playlist = await getPlaylist().catch((e) => {
        console.error(e);
        return null;
    });
    if (!playlist) {
        return (
            <p className="rounded-lg bg-white/[0.05] p-4 text-sm text-[#B3B3B3]">
                Playlist şu an yüklenemedi. Birazdan sayfayı yenile; istek listesi çalışmaya
                devam ediyor.
            </p>
        );
    }
    return <PlaylistPanel tracks={playlist.tracks} fetchedAt={playlist.fetchedAt} />;
}

export default function PlaylistSection() {
    return (
        <section className="relative mt-3 flex min-h-0 flex-1 flex-col px-5">
            <Suspense
                fallback={
                    <>
                        <div className="mb-1 h-10 shrink-0 rounded-lg bg-white/[0.09]" />
                        <div className="-mx-5 min-h-0 flex-1 overflow-hidden px-5">
                            <LoadingTracks />
                        </div>
                    </>
                }
            >
                <PlaylistData />
            </Suspense>
        </section>
    );
}
