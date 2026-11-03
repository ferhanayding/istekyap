"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, ThumbsDown, ThumbsUp } from "lucide-react";
import LoadingTracks from "../LoadingTracks";

type Song = {
    id: string;
    name: string;
    artists: string;
    cover: string | null;
    url: string;
    likes: number;
    dislikes: number;
};

type Filter = "all" | "liked" | "disliked";

const POLL_MS = 20_000;

const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "Hepsi" },
    { key: "liked", label: "Beğenilen" },
    { key: "disliked", label: "Beğenilmeyen" },
];

const EMPTY: Record<Filter, string> = {
    all: "Playlistte şarkı yok.",
    liked: "Beğenisi fazla olan şarkı yok.",
    disliked: "Beğenmemesi fazla olan şarkı yok.",
};

export default function SongStats() {
    const [songs, setSongs] = useState<Song[] | null>(null);
    const [filter, setFilter] = useState<Filter>("all");
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/dashboard/songs", { cache: "no-store" });
            if (res.status === 401) {
                window.location.assign("/login");
                return;
            }
            const data: unknown = await res.json();
            if (!res.ok || !Array.isArray(data)) throw new Error();
            setSongs(data as Song[]);
            setError(null);
        } catch {
            setError("Liste güncellenemedi, tekrar denenecek.");
        }
    }, []);

    useEffect(() => {
        const first = setTimeout(() => load(), 0);
        const timer = setInterval(() => {
            if (!document.hidden) load();
        }, POLL_MS);
        return () => {
            clearTimeout(first);
            clearInterval(timer);
        };
    }, [load]);

    const match = (s: Song, f: Filter) =>
        f === "all"
            ? true
            : f === "liked"
                ? s.likes > s.dislikes
                : s.dislikes > s.likes;

    const count = (f: Filter) => songs?.filter((s) => match(s, f)).length ?? 0;

    const visible = (songs ?? [])
        .filter((s) => match(s, filter))
        .sort((a, b) =>
            filter === "disliked"
                ? b.dislikes - a.dislikes || a.name.localeCompare(b.name, "tr")
                : b.likes - a.likes || a.name.localeCompare(b.name, "tr")
        );

    return (
        <>
            {error && (
                <p
                    role="alert"
                    className="mb-4 shrink-0 rounded-xl bg-[#FF729B]/10 px-3 py-2 text-sm text-[#FF729B]"
                >
                    {error}
                </p>
            )}

            <div className="mb-4 flex shrink-0 gap-2 overflow-x-auto" role="tablist">
                {FILTERS.map((f) => (
                    <button
                        key={f.key}
                        type="button"
                        role="tab"
                        aria-selected={filter === f.key}
                        onClick={() => setFilter(f.key)}
                        className={`shrink-0 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${filter === f.key
                            ? "bg-[#7555E9] text-white"
                            : "bg-white/[0.05] text-[#A99EC9] hover:bg-white/[0.08]"
                            }`}
                    >
                        {f.label} <span className="opacity-70">{count(f.key)}</span>
                    </button>
                ))}
            </div>

            <div className="-mx-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-10 [scrollbar-color:#3A3270_transparent] [scrollbar-width:thin]">
                {songs === null ? (
                    <LoadingTracks />
                ) : visible.length === 0 ? (
                    <p className="rounded-2xl bg-[#19162D] p-4 text-sm text-[#89839F]">
                        {EMPTY[filter]}
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {visible.map((s) => (
                            <li
                                key={s.id}
                                className="flex items-center gap-3 rounded-2xl border border-white/[0.04] bg-[#19162D] p-3"
                            >
                                {s.cover ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={s.cover}
                                        alt=""
                                        width={52}
                                        height={52}
                                        className="size-[52px] shrink-0 rounded-xl object-cover"
                                    />
                                ) : (
                                    <div className="size-[52px] shrink-0 rounded-xl bg-white/10" />
                                )}

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[15px] font-bold text-[#F5F2FF]">
                                        {s.name}
                                    </p>
                                    <p className="mt-0.5 truncate text-xs text-[#89839F]">
                                        {s.artists}
                                    </p>
                                    <div className="mt-1.5 flex items-center gap-2">
                                        <span className="flex items-center gap-1 rounded-full bg-[#37D9BD]/15 px-2 py-0.5 text-xs font-bold text-[#37D9BD]">
                                            <ThumbsUp size={12} />
                                            {s.likes}
                                        </span>
                                        <span className="flex items-center gap-1 rounded-full bg-[#FF729B]/15 px-2 py-0.5 text-xs font-bold text-[#FF729B]">
                                            <ThumbsDown size={12} />
                                            {s.dislikes}
                                        </span>
                                    </div>
                                </div>

                                <a
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Spotify'da aç"
                                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-[#AAA2C6] transition hover:bg-white/10"
                                >
                                    <ExternalLink size={16} />
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}