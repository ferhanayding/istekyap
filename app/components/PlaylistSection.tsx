import { Suspense } from "react";
import { ListMusic, Search } from "lucide-react";
import TrackList from "./TrackList";
import TrackCount from "./TrackCount";
import LoadingTracks from "./LoadingTracks";

export default function PlaylistSection() {
    return (
        <section className="relative mt-5 flex min-h-0 flex-1 flex-col px-5">
            <div className="mb-3 flex shrink-0 items-end justify-between">
                <div>
                    <div className="mb-1.5 flex items-center gap-2">
                        <ListMusic size={16} className="text-[#A58AFF]" />
                        <span className="text-[10px] font-bold uppercase tracking-[2px] text-[#8F86AB]">
                            MÜZİK ARŞİVİ
                        </span>
                    </div>

                    <h2 className="text-2xl font-extrabold tracking-tight">
                        Playlistimiz
                    </h2>

                    <p className="mt-1 text-xs text-[#817A98]">
                        <Suspense fallback="…">
                            <TrackCount />
                        </Suspense>{" "}
                        · LƏYSAN
                    </p>
                </div>

                <button
                    type="button"
                    aria-label="Şarkı ara"
                    className="flex size-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.04] text-[#A99EC9]"
                >
                    <Search size={19} />
                </button>
            </div>

            <div className="-mx-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 [scrollbar-color:#3A3270_transparent] [scrollbar-width:thin]">
                <Suspense fallback={<LoadingTracks />}>
                    <TrackList />
                </Suspense>

                <p className="py-6 text-center text-[10px] tracking-wider text-[#5F5875]">
                    MADE FOR MUSIC LOVERS · LƏYSAN
                </p>
            </div>
        </section>
    );
}