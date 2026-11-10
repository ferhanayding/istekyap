"use client";
import { useRouter } from "next/navigation";
import { useToast } from "../Toast";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Play,
    Square,
    ThumbsDown,
    ThumbsUp,
} from "lucide-react";
import LoadingTracks from "../LoadingTracks";
import EqBars from "../EqBars";
import { addedInfo } from "@/lib/added";
import { LyricsButton } from "../LyricsSheet";

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
            <div
                className="mb-2 flex shrink-0 gap-2 overflow-x-auto pb-1 [scrollbar-color:var(--color-line)_transparent] [scrollbar-width:thin]"
                role="tablist"
            >
                {FILTERS.map((f) => (
                    <button
                        key={f.key}
                        type="button"
                        role="tab"
                        aria-selected={filter === f.key}
                        onClick={() => setFilter(f.key)}
                        className={`h-8 shrink-0 rounded-full px-3.5 text-xs font-bold transition ${filter === f.key
                            ? "bg-accent text-on-accent"
                            : "bg-raised text-ink hover:bg-line"
                            }`}
                    >
                        {f.label} <span className="opacity-70">{count(f.key)}</span>
                    </button>
                ))}
            </div>

            <div className="mb-1 flex shrink-0 items-center gap-2 text-xs font-bold text-muted">
                {songs && (
                    <>
                        <span>{songs.length} şarkı</span>
                        <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-accent">
                            <ThumbsUp size={12} />
                            {totalLikes}
                        </span>
                        <span className="flex items-center gap-1 rounded-full bg-danger/15 px-2 py-0.5 text-danger">
                            <ThumbsDown size={12} />
                            {totalDislikes}
                        </span>
                    </>
                )}
                <label htmlFor="song-sort" className="sr-only">
                    Sırala
                </label>
                <select
                    id="song-sort"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
                    className="ml-auto h-8 rounded-full bg-raised px-3 text-xs font-bold text-ink focus:outline-none"
                >
                    {SORTS.map((s) => (
                        <option key={s.key} value={s.key} className="bg-surface">
                            {s.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="-mx-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 [scrollbar-color:var(--color-line)_transparent] [scrollbar-width:thin]">
                {songs === null ? (
                    <LoadingTracks />
                ) : visible.length === 0 ? (
                    <p className="mt-2 rounded-lg bg-surface p-4 text-sm text-muted">
                        {EMPTY[filter]}
                    </p>
                ) : (
                    <ul>
                        {visible.map((s) => {
                            const added = addedInfo(s.addedAt, now || undefined);
                            const net = s.likes - s.dislikes;
                            const playing = nowPlaying === s.id;
                            const wasPlayed = playedSet.has(s.id);
                            return (
                                <li key={s.id} className="flex items-center gap-3 py-2">
                                    {s.cover ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                loading="lazy"
                decoding="async"
                                            src={s.cover}
                                            alt=""
                                            width={56}
                                            height={56}
                                            className="size-14 shrink-0 rounded-[4px] object-cover"
                                        />
                                    ) : (
                                        <div className="size-14 shrink-0 rounded-[4px] bg-line" />
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <p
                                            className={`truncate text-base ${playing
                                                ? "font-bold text-accent"
                                                : "font-medium text-ink"
                                                }`}
                                        >
                                            {s.name}
                                        </p>
                                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted">
                                            {playing && <EqBars className="shrink-0" />}
                                            {!playing && wasPlayed && (
                                                <span className="shrink-0 rounded bg-raised px-1.5 text-xs font-extrabold uppercase text-ink">
                                                    Çalındı
                                                </span>
                                            )}
                                            {!playing && added?.isNew && (
                                                <span className="shrink-0 rounded bg-accent px-1.5 text-xs font-extrabold uppercase text-on-accent">
                                                    Yeni
                                                </span>
                                            )}
                                            <span className="truncate">{s.artists}</span>
                                        </p>
                                        <div className="mt-1 flex items-center gap-2 text-xs font-bold">
                                            <span className="flex items-center gap-1 text-accent">
                                                <ThumbsUp size={12} />
                                                {s.likes}
                                            </span>
                                            <span className="flex items-center gap-1 text-danger">
                                                <ThumbsDown size={12} />
                                                {s.dislikes}
                                            </span>
                                            <span
                                                className={
                                                    net > 0
                                                        ? "text-accent"
                                                        : net < 0
                                                            ? "text-danger"
                                                            : "text-faint"
                                                }
                                            >
                                                Net {net > 0 ? `+${net}` : net}
                                            </span>
                                            {added && (
                                                <span
                                                    className="truncate font-normal text-faint"
                                                    suppressHydrationWarning
                                                >
                                                    {added.label}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() =>
                                            playing ? onStop() : onPlay(s.id, `${s.name} · ${s.artists}`)
                                        }
                                        aria-label={playing ? `${s.name} durdur` : `${s.name} çal`}
                                        className={`flex size-10 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-50 ${playing
                                            ? "bg-danger/20 text-danger"
                                            : "bg-accent text-on-accent"
                                            }`}
                                    >
                                        {playing ? (
                                            <Square size={14} fill="currentColor" />
                                        ) : (
                                            <Play size={16} fill="currentColor" />
                                        )}
                                    </button>
                                    <LyricsButton name={s.name} artists={s.artists} />
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </>
    );
}
