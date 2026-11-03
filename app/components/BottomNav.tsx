"use client";

import { ListMusic, Music2 } from "lucide-react";

export type Tab = "playlist" | "requests";

export default function BottomNav({
    tab,
    unread,
    onTab,
}: {
    tab: Tab;
    unread: number;
    onTab: (t: Tab) => void;
}) {
    const color = (active: boolean) =>
        active ? "text-[#A58AFF]" : "text-[#77708F]";
    const weight = (active: boolean) => (active ? "font-bold" : "font-medium");

    return (
        <nav className="relative z-10 shrink-0 border-t border-white/[0.07] bg-[#171428]/95 px-8 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
            <div className="flex items-center justify-around">
                <button
                    type="button"
                    onClick={() => onTab("playlist")}
                    aria-current={tab === "playlist" ? "page" : undefined}
                    className={`flex flex-col items-center gap-1.5 ${color(tab === "playlist")}`}
                >
                    <Music2 size={21} />
                    <span className={`text-[10px] ${weight(tab === "playlist")}`}>
                        Playlist
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => onTab("requests")}
                    aria-current={tab === "requests" ? "page" : undefined}
                    className={`flex flex-col items-center gap-1.5 ${color(tab === "requests")}`}
                >
                    <span className="relative">
                        <ListMusic size={21} />
                        {unread > 0 && (
                            <span className="absolute -right-3 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF729B] px-1 text-[10px] font-bold text-white">
                                {unread > 9 ? "9+" : unread}
                            </span>
                        )}
                    </span>
                    <span className={`text-[10px] ${weight(tab === "requests")}`}>
                        İstek Listesi
                    </span>
                </button>

                {/* <button
                    type="button"
                    className="flex flex-col items-center gap-1.5 text-[#77708F]"
                >
                    <Heart size={21} />
                    <span className="text-[10px] font-medium">Popüler</span>
                </button> */}
            </div>
        </nav>
    );
}