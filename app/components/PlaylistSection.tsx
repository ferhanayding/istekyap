import { Suspense } from "react";
import { getTracks } from "@/lib/tracks";
import PlaylistPanel from "./PlaylistPanel";
import LoadingTracks from "./LoadingTracks";

async function PlaylistData() {
    const tracks = await getTracks();
    return <PlaylistPanel tracks={tracks} />;
}

export default function PlaylistSection() {
    return (
        <section className="relative mt-3 flex min-h-0 flex-1 flex-col px-5">
            <Suspense
                fallback={
                    <>
                        <div className="mb-3 h-11 shrink-0 rounded-2xl border border-white/[0.08] bg-[#1E1A3D]" />
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