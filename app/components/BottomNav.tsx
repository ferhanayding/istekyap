"use client";

import { ListMusic, Music2 } from "lucide-react";

export type Tab = "playlist" | "requests";

const ITEMS: { key: Tab; label: string; Icon: typeof Music2 }[] = [
    { key: "playlist", label: "Playlist", Icon: Music2 },
    { key: "requests", label: "İstek Listesi", Icon: ListMusic },
];

export default function BottomNav({
    tab,
    unread,
    onTab,
}: {
    tab: Tab;
    unread: number;
    onTab: (t: Tab) => void;
}) {
    return (
        <nav
            aria-label="Ana menü"
            className="relative z-30 shrink-0 border-t border-white/[0.06] bg-[#0E0C1A]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur"
        >
            <ul className="grid grid-cols-2">
                {ITEMS.map(({ key, label, Icon }) => {
                    const active = tab === key;
                    return (
                        <li key={key}>
                            <button
                                type="button"
                                onClick={() => onTab(key)}
                                aria-current={active ? "page" : undefined}
                                className="group flex w-full flex-col items-center gap-1 py-1 outline-none"
                            >
                                <span
                                    className={`relative flex h-8 w-16 items-center justify-center rounded-full transition ${active ? "bg-[#7555E9]" : "group-hover:bg-white/[0.06]"
                                        }`}
                                >
                                    <Icon
                                        size={20}
                                        className={active ? "text-white" : "text-[#9A94B0]"}
                                    />
                                    {key === "requests" && unread > 0 && (
                                        <span className="absolute -right-0.5 -top-1 min-w-[18px] rounded-full bg-[#FF729B] px-1 text-center text-[10px] font-bold leading-[18px] text-white">
                                            {unread > 9 ? "9+" : unread}
                                        </span>
                                    )}
                                </span>
                                <span
                                    className={`text-[11px] font-bold ${active ? "text-white" : "text-[#9A94B0]"
                                        }`}
                                >
                                    {label}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}