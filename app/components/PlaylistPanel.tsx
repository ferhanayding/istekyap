"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { Track } from "@/lib/spotify";
import { useSystem } from "@/lib/system-context";
import { useSharedVotes } from "@/lib/votes-context";
import { CLEAR_SEARCH_EVENT } from "@/lib/scroll";
import { fold } from "@/lib/fold";
import TrackItem from "./TrackItem";

export default function PlaylistPanel({
    tracks,
    fetchedAt,
}: {
    tracks: Track[];
    fetchedAt: number;
}) {
    const [query, setQuery] = useState("");
    // "Bu hafta / 2 hafta önce" etiketleri: sunucudaki hazır HTML playlistin çekildiği ana göre,
    // sayfa açılınca telefonun saatine göre hesaplanır (ikisi aynı çıkar, hydration bozulmaz)
    const [now, setNow] = useState(fetchedAt);
    useEffect(() => {
        const t = setTimeout(() => setNow(Date.now()), 0);
        return () => clearTimeout(t);
    }, []);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { votes, vote } = useSharedVotes();
    const system = useSystem();

    // Mini oynatıcıya basınca arama temizlensin ki çalan şarkı listede görünsün
    useEffect(() => {
        const clear = () => setQuery("");
        window.addEventListener(CLEAR_SEARCH_EVENT, clear);
        return () => window.removeEventListener(CLEAR_SEARCH_EVENT, clear);
    }, []);

    const indexed = useMemo(
        () =>
            tracks.map((t, i) => ({
                t,
                i,
                hay: fold(`${t.name} ${t.artists} ${t.album}`),
            })),
        [tracks]
    );

    const visible = useMemo(() => {
        const words = fold(query).split(/\s+/).filter(Boolean);
        if (words.length === 0) return indexed;
        return indexed.filter((x) => words.every((w) => x.hay.includes(w)));
    }, [indexed, query]);

    const searching = query.trim() !== "";

    function clear() {
        setQuery("");
        inputRef.current?.focus();
    }

    return (
        <>
            <div className="mb-1 flex h-10 shrink-0 items-center gap-2 rounded-lg bg-raised px-3 transition focus-within:bg-line">
                <Search size={17} className="shrink-0 text-muted" />
                <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        scrollRef.current?.scrollTo({ top: 0 });
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setQuery("");
                        if (e.key === "Enter") e.currentTarget.blur(); // telefonda klavye kapansın
                    }}
                    placeholder={`Playlistte ara · ${tracks.length} şarkı`}
                    aria-label="Playlistte şarkı ara"
                    enterKeyHint="search"
                    autoComplete="off"
                    maxLength={100}
                    className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-faint"
                />
                {searching && (
                    <>
                        <span className="shrink-0 text-xs font-bold text-faint">
                            {visible.length} / {tracks.length}
                        </span>
                        <button
                            type="button"
                            onClick={clear}
                            aria-label="Aramayı temizle"
                            className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-line"
                        >
                            <X size={15} />
                        </button>
                    </>
                )}
            </div>

            <div
                ref={scrollRef}
                data-scroll-list
                className="-mx-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 [scrollbar-color:var(--color-line)_transparent] [scrollbar-width:thin]"
            >
                {visible.length > 0 ? (
                    <div>
                        {visible.map(({ t, i }, pos) => (
                            <TrackItem
                                key={`${t.id}-${i}`}
                                track={t}
                                likes={votes[t.id]?.likes ?? 0}
                                mine={votes[t.id]?.mine ?? 0}
                                onVote={vote}
                                played={system.played.has(t.id)}
                                votingOpen={system.votingOpen}
                                playing={system.nowPlaying === t.id}
                                now={now}
                                eager={pos < 8}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="mt-2 rounded-lg bg-surface p-4 text-sm text-muted">
                        &quot;{query.trim()}&quot; playlistte yok. &quot;İstek Parça
                        Yap&quot; butonundan isteyebilirsin.
                    </p>
                )}

                <p className="py-6 text-center text-xs tracking-wider text-faint">
                    MADE FOR MUSIC LOVERS · LƏYSAN
                </p>
            </div>
        </>
    );
}