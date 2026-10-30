import { Suspense } from "react";
import { getTracks } from "@/lib/tracks";
import PlaylistHeading from "./PlaylistHeading";
import PlaylistPanel from "./PlaylistPanel";
import LoadingTracks from "./LoadingTracks";

async function PlaylistData() {
    const tracks = await getTracks();
    return <PlaylistPanel tracks={tracks} />;
}

export default function PlaylistSection() {
    return (
        <section className="relative mt-5 flex min-h-0 flex-1 flex-col px-5">
            <Suspense
                fallback={
                    <>
                        <PlaylistHeading subtitle="…" />
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