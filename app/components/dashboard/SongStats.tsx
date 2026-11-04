"use client";
import { useRouter } from "next/navigation";
import { useToast } from "../Toast";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ExternalLink,
    Play,
    Square,
    ThumbsDown,
    ThumbsUp,
} from "lucide-react";
import LoadingTracks from "../LoadingTracks";
import NowPlayingBadge from "../NowPlayingBadge";
import { addedInfo } from "@/lib/added";

type Song = {
    id: string;
    name: string;
    artists: string;
    album: string;
    cover: string | null;
    url: string;
    addedAt: string | null;
    likes: number;
    dislikes: number;
};

type Filter = "all" | "played" | "unplayed" | "liked" | "disliked";
type Sort = "playlist" | "likes" | "dislikes" | "newest" | "oldest";
const POLL_MS = 20_000;

const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "Hepsi" },
    { key: "played", label: "Çalınan" },
    { key: "unplayed", label: "Çalınmayan" },
    { key: "liked", label: "Beğenilen" },
    { key: "disliked", label: "Beğenilmeyen" },
];

const SORTS: { key: Sort; label: string }[] = [
    { key: "playlist", label: "Playlist sırası" },
    { key: "likes", label: "En çok beğenilen" },
    { key: "dislikes", label: "En çok beğenilmeyen" },
    { key: "newest", label: "En yeni eklenen" },
    { key: "oldest", label: "En eski eklenen" },
];

const EMPTY: Record<Filter, string> = {
    all: "Playlistte şarkı yok.",
    played: "Bu gece henüz çalınan şarkı yok.",
    unplayed: "Çalınmamış şarkı kalmadı.",
    liked: "Beğenisi fazla olan şarkı yok.",
    disliked: "Beğenmemesi fazla olan şarkı yok.",
};

const time = (s: Song) => (s.addedAt ? new Date(s.addedAt).getTime() : 0);

export default function SongStats({
    nowPlaying,
    played,
    busy,
    onPlay,
    onStop,
}: {
    nowPlaying: string | null;
    played: string[];
    busy: boolean;
    onPlay: (id: string, title: string) => void;
    onStop: () => void;
}) {
    const [songs, setSongs] = useState<Song[] | null>(null);
    const [filter, setFilter] = useState<Filter>("all");
    const [sort, setSort] = useState<Sort>("playlist");
    const [error, setError] = useState<string | null>(null);
    const [now, setNow] = useState(0);
    const router = useRouter();
    const toast = useToast();
    useEffect(() => {
        if (error) toast.error(error);
    }, [error, toast]);
    const playedSet = useMemo(() => new Set(played), [played]);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/dashboard/songs", { cache: "no-store" });
            if (res.status === 401) {
                router.replace("/login");
                return;
            }
            const data: unknown = await res.json();
            if (!res.ok || !Array.isArray(data)) throw new Error();
            setSongs(data as Song[]);
            setNow(Date.now());
            setError(null);
        } catch {
            setError("Liste güncellenemedi, tekrar denenecek.");
        }
    }, [router]);

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

    const match = (s: Song, f: Filter) => {
        if (f === "all") return true;
        if (f === "played") return playedSet.has(s.id);
        if (f === "unplayed") return !playedSet.has(s.id);
        if (f === "liked") return s.likes > s.dislikes;
        return s.dislikes > s.likes;
    };

    const count = (f: Filter) => songs?.filter((s) => match(s, f)).length ?? 0;
    const totalLikes = songs?.reduce((n, s) => n + s.likes, 0) ?? 0;
    const totalDislikes = songs?.reduce((n, s) => n + s.dislikes, 0) ?? 0;

    const byName = (a: Song, b: Song) => a.name.localeCompare(b.name, "tr");
    const visible = (songs ?? [])
        .filter((s) => match(s, filter))
        .sort((a, b) => {
            switch (sort) {
                case "playlist":
                    return 0;
                case "dislikes":
                    return b.dislikes - a.dislikes || byName(a, b);
                case "newest":
                    return time(b) - time(a) || byName(a, b);
                case "oldest":
                    return time(a) - time(b) || byName(a, b);
                default:
                    return b.likes - a.likes || byName(a, b);
            }
        });

    return (
        <>
            {songs && (
                <div className="mb-3 flex shrink-0 items-center gap-2 text-xs font-bold text-[#928BA8]">
                    <span>{songs.length} şarkı</span>
                    <span className="flex items-center gap-1 rounded-full bg-[#37D9BD]/15 px-2 py-0.5 text-[#37D9BD]">
                        <ThumbsUp size={12} />
                        {totalLikes}
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-[#FF729B]/15 px-2 py-0.5 text-[#FF729B]">
                        <ThumbsDown size={12} />
                        {totalDislikes}
                    </span>
                </div>
            )}



            <div
                className="mb-1 flex shrink-0 gap-2 overflow-x-auto pb-2 [scrollbar-color:#3A3270_transparent] [scrollbar-width:thin]"
                role="tablist"
            >                {FILTERS.map((f) => (
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

            <div className="mb-3 flex shrink-0 items-center gap-2">
                <label htmlFor="song-sort" className="text-xs text-[#817A98]">
                    Sırala
                </label>
                <select
                    id="song-sort"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
                    className="rounded-xl border border-white/[0.06] bg-[#19162D] px-3 py-2 text-xs font-bold text-[#C9C2E4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B80FF]"
                >
                    {SORTS.map((s) => (
                        <option key={s.key} value={s.key}>
                            {s.label}
                        </option>
                    ))}
                </select>
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
                        {visible.map((s) => {
                            const added = addedInfo(s.addedAt, now || undefined);
                            const net = s.likes - s.dislikes;
                            const playing = nowPlaying === s.id;
                            const wasPlayed = playedSet.has(s.id);
                            return (
                                <li
                                    key={s.id}
                                    className={`flex items-center gap-3 rounded-2xl border p-2.5 ${playing
                                        ? "border-[#37D9BD]/50 bg-gradient-to-r from-[#17342F] to-[#19162D] shadow-[0_0_24px_-8px_#37D9BD]"
                                        : "border-white/[0.04] bg-[#19162D]"
                                        }`}
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
                                        {playing ? (
                                            <NowPlayingBadge className="mt-1" />
                                        ) : (
                                            <p
                                                className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-[#625D78]"
                                                suppressHydrationWarning
                                            >
                                                {wasPlayed && (
                                                    <span className="shrink-0 rounded-full bg-[#9B80FF]/15 px-1.5 py-px font-bold text-[#B9A6FF]">
                                                        Çalındı
                                                    </span>
                                                )}
                                                {added?.isNew && (
                                                    <span className="shrink-0 rounded-full bg-[#37D9BD]/20 px-1.5 py-px font-bold text-[#37D9BD]">
                                                        Yeni
                                                    </span>
                                                )}
                                                <span className="truncate">
                                                    {added ? `${added.label} · ${s.album}` : s.album}
                                                </span>
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="flex items-center gap-1 rounded-full bg-[#37D9BD]/15 px-2 py-0.5 text-xs font-bold text-[#37D9BD]">
                                                <ThumbsUp size={12} />
                                                {s.likes}
                                            </span>
                                            <span className="flex items-center gap-1 rounded-full bg-[#FF729B]/15 px-2 py-0.5 text-xs font-bold text-[#FF729B]">
                                                <ThumbsDown size={12} />
                                                {s.dislikes}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className={`mr-1 text-[11px] font-bold ${net > 0
                                                    ? "text-[#37D9BD]"
                                                    : net < 0
                                                        ? "text-[#FF729B]"
                                                        : "text-[#817A98]"
                                                    }`}
                                            >
                                                Net {net > 0 ? `+${net}` : net}
                                            </span>
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() =>
                                                    playing
                                                        ? onStop()
                                                        : onPlay(s.id, `${s.name} · ${s.artists}`)
                                                }
                                                aria-label={playing ? "Durdur" : "Çal"}
                                                className={`flex size-8 items-center justify-center rounded-lg transition active:scale-95 disabled:opacity-50 ${playing
                                                    ? "bg-[#FF729B]/20 text-[#FF729B]"
                                                    : "bg-[#37D9BD]/15 text-[#37D9BD]"
                                                    }`}
                                            >
                                                {playing ? (
                                                    <Square size={13} fill="currentColor" />
                                                ) : (
                                                    <Play size={14} fill="currentColor" />
                                                )}
                                            </button>
                                            <a
                                                href={s.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label="Spotify'da aç"
                                                className="flex size-8 items-center justify-center rounded-lg bg-white/[0.05] text-[#AAA2C6] transition hover:bg-white/10"
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </>
    );
}