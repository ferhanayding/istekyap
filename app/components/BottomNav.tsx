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
            className="relative z-30 shrink-0 border-t border-line bg-page px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
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
                                className="group flex w-full flex-col items-center gap-1 rounded-lg py-1"
                            >
                                <span
                                    className={`relative flex h-8 w-16 items-center justify-center rounded-full transition ${active ? "bg-ink" : "group-hover:bg-raised"
                                        }`}
                                >
                                    <Icon
                                        size={20}
                                        className={active ? "text-page" : "text-muted"}
                                    />
                                    {key === "requests" && unread > 0 && (
                                        <span className="absolute -right-0.5 -top-1 min-w-[18px] rounded-full bg-accent px-1 text-center text-xs font-bold leading-[18px] text-on-accent">
                                            {unread > 9 ? "9+" : unread}
                                        </span>
                                    )}
                                </span>
                                <span
                                    className={`text-xs font-bold ${active ? "text-ink" : "text-muted"
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