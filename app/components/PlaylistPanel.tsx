"use client";

import { useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { Track } from "@/lib/spotify";
import { useVotes } from "@/lib/use-votes";
import TrackItem from "./TrackItem";

// Küçük harfe çevir, Türkçe karakterleri ve aksanları sadeleştir
const fold = (s: string) =>
    s
        .toLocaleLowerCase("tr")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ı/g, "i");

export default function PlaylistPanel({ tracks }: { tracks: Track[] }) {
    const [query, setQuery] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { votes, vote, error: voteError } = useVotes();

    // i: şarkının asıl sırası, renkler arama yapınca da aynı kalsın
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
            <div className="mb-3 flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#1E1A3D] px-3 transition focus-within:border-[#9B80FF]/60">
                <Search size={17} className="shrink-0 text-[#A99EC9]" />
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
                    placeholder={`${tracks.length} şarkı içinde ara`}
                    aria-label="Playlistte şarkı ara"
                    enterKeyHint="search"
                    autoComplete="off"
                    maxLength={100}
                    className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-[#7E769B]"
                />
                {searching && (
                    <>
                        <span className="shrink-0 text-xs font-bold text-[#817A98]">
                            {visible.length} / {tracks.length}
                        </span>
                        <button
                            type="button"
                            onClick={clear}
                            aria-label="Aramayı temizle"
                            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[#A99EC9] transition hover:bg-white/[0.12]"
                        >
                            <X size={14} />
                        </button>
                    </>
                )}
            </div>

            <div
                ref={scrollRef}
                className="-mx-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 [scrollbar-color:#3A3270_transparent] [scrollbar-width:thin]"
            >
                {voteError && (
                    <p
                        role="alert"
                        className="mb-2 rounded-xl bg-[#FF729B]/10 px-3 py-2 text-xs text-[#FF729B]"
                    >
                        {voteError}
                    </p>
                )}

                {visible.length > 0 ? (
                    <div className="space-y-2">
                        {visible.map(({ t, i }) => (
                            <TrackItem
                                key={`${t.id}-${i}`}
                                track={t}
                                index={i}
                                likes={votes[t.id]?.likes ?? 0}
                                mine={votes[t.id]?.mine ?? 0}
                                onVote={vote}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="rounded-2xl bg-[#19162D] p-4 text-sm text-[#89839F]">
                        &quot;{query.trim()}&quot; playlistte yok. &quot;İstek Parça
                        Yap&quot; butonundan isteyebilirsin.
                    </p>
                )}

                <p className="py-6 text-center text-[10px] tracking-wider text-[#5F5875]">
                    MADE FOR MUSIC LOVERS · LƏYSAN
                </p>
            </div>
        </>
    );
}