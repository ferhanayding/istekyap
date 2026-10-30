"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { Track } from "@/lib/spotify";
import PlaylistHeading from "./PlaylistHeading";
import TrackItem from "./TrackItem";

// Küçük harfe çevir, Türkçe karakterleri ve aksanları sadeleştir
const fold = (s: string) =>
    s
        .toLocaleLowerCase("tr")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ı/g, "i");

export default function PlaylistPanel({ tracks }: { tracks: Track[] }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    function toggle() {
        if (open) setQuery("");
        setOpen(!open);
    }

    return (
        <>
            <PlaylistHeading
                subtitle={
                    searching
                        ? `${visible.length} / ${tracks.length} şarkı`
                        : `${tracks.length} şarkı`
                }
                searchOpen={open}
                onToggleSearch={toggle}
            />

            {/* Arama kutusu: açılırken yukarıdan aşağı büyür */}
            <div
                inert={!open}
                className={`grid shrink-0 transition-all duration-300 ease-out motion-reduce:transition-none ${open ? "mb-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
            >
                <div className="overflow-hidden">
                    <div className="flex h-12 items-center gap-2 rounded-2xl border border-[#9B80FF]/40 bg-[#1E1A3D] px-3">
                        <Search size={18} className="shrink-0 text-[#A99EC9]" />
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                scrollRef.current?.scrollTo({ top: 0 });
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Escape") toggle();
                                if (e.key === "Enter") e.currentTarget.blur(); // telefonda klavye kapansın
                            }}
                            placeholder="Playlistte şarkı ara"
                            aria-label="Playlistte şarkı ara"
                            enterKeyHint="search"
                            autoComplete="off"
                            maxLength={100}
                            className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-[#7E769B]"
                        />
                    </div>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="-mx-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 [scrollbar-color:#3A3270_transparent] [scrollbar-width:thin]"
            >
                {visible.length > 0 ? (
                    <div className="space-y-2">
                        {visible.map(({ t, i }) => (
                            <TrackItem key={`${t.id}-${i}`} track={t} index={i} />
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