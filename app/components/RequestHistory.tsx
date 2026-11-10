"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, ThumbsUp, X } from "lucide-react";
import type { HistorySong } from "@/lib/history-types";
import type { RequestStatus } from "@/lib/use-request-feed";
import { useLive } from "@/lib/live-client";
import { fold } from "@/lib/fold";
import { LyricsButton } from "./LyricsSheet";
import LoadingTracks from "./LoadingTracks";
import AskButton from "./AskButton";
import SongRow from "./SongRow";

type Sort = "most" | "recent";


// Bugüne kadar istenen bütün şarkılar: kaç kez istendi, çalındı, beğenildi.
// Buradan da istek atılabilir.
export default function RequestHistory({
    tonight,
    active,
}: {
    /** Bu geceki listedeki şarkılar ve durumları */
    tonight: Map<string, RequestStatus>;
    /** Sekme şu an açık mı (açılınca ve liste değişince yenilenir) */
    active: boolean;
}) {
    const [list, setList] = useState<HistorySong[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<Sort>("most");

    // v: canlı sinyalin sürümü (herkes aynı adresi ister, CDN tek cevap verir)
    const load = useCallback(async (v?: number) => {
        try {
            const res = await fetch(
                v ? `/api/requests/history?v=${v}` : "/api/requests/history"
            );
            const data: unknown = await res.json();
            if (!res.ok || !Array.isArray(data)) throw new Error();
            setList(data as HistorySong[]);
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, []);

    // Sekmeye her geçişte tazele
    useEffect(() => {
        if (!active) return;
        const t = setTimeout(() => void load(), 0);
        return () => clearTimeout(t);
    }, [active, load]);

    // Sekme açıkken biri istek atınca ya da gece bitince hemen tazele
    const activeRef = useRef(active);
    useEffect(() => {
        activeRef.current = active;
    }, [active]);
    useLive("requests", (v) => {
        if (activeRef.current) void load(v);
    });

    const visible = useMemo(() => {
        if (!list) return [];
        const words = fold(query).split(/\s+/).filter(Boolean);
        const found = words.length
            ? list.filter((s) => {
                const hay = fold(`${s.name} ${s.artists}`);
                return words.every((w) => hay.includes(w));
            })
            : list;
        // Sunucu en çok istenene göre sıralı gönderir
        return sort === "recent"
            ? [...found].sort((a, b) => (a.lastRequested < b.lastRequested ? 1 : -1))
            : found;
    }, [list, query, sort]);

    if (failed && !list) {
        return (
            <p className="mt-2 rounded-lg bg-surface p-4 text-sm text-muted">
                Eski istekler alınamadı.{" "}
                <button
                    type="button"
                    onClick={() => void load()}
                    className="font-bold text-ink"
                >
                    Tekrar dene
                </button>
            </p>
        );
    }

    if (!list) return <LoadingTracks />;

    if (list.length === 0) {
        return (
            <p className="mt-2 rounded-lg bg-surface p-4 text-sm text-muted">
                Henüz eski istek yok. Geceler geçtikçe istenen şarkılar burada birikir.
            </p>
        );
    }

    return (
        <>
            <div className="mb-1 flex shrink-0 items-center gap-2">
                <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg bg-raised px-3 transition focus-within:bg-line">
                    <Search size={15} className="shrink-0 text-muted" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") setQuery("");
                            if (e.key === "Enter") e.currentTarget.blur();
                        }}
                        placeholder={`Ara · ${list.length} şarkı`}
                        aria-label="Eski isteklerde ara"
                        enterKeyHint="search"
                        autoComplete="off"
                        maxLength={100}
                        className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-faint"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            aria-label="Aramayı temizle"
                            className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-line"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => setSort(sort === "most" ? "recent" : "most")}
                    aria-label="Sıralamayı değiştir"
                    className="h-9 shrink-0 rounded-lg bg-raised px-3 text-xs font-bold text-ink transition hover:bg-line"
                >
                    {sort === "most" ? "En çok istenen" : "En yeni"}
                </button>
            </div>

            <div
                data-scroll-list
                className="-mx-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 [scrollbar-color:var(--color-line)_transparent] [scrollbar-width:thin]"
            >
                {visible.length === 0 ? (
                    <p className="mt-2 rounded-lg bg-surface p-4 text-sm text-muted">
                        &quot;{query.trim()}&quot; daha önce istenmemiş. Yukarıdaki &quot;İstek
                        Parça Yap&quot; butonundan arayabilirsin.
                    </p>
                ) : (
                    <ul>
                        {visible.map((s, idx) => {
                            const status = tonight.get(s.spotify_id);
                            const inList = status === "pending" || status === "approved";
                            return (
                                <SongRow
                                    key={s.spotify_id}
                                    as="li"
                                    id={`old-${s.spotify_id}`}
                                    cover={s.cover}
                                    name={s.name}
                                    artists={s.artists}
                                    eager={idx < 8}
                                    meta={
                                        <>
                                            <span className="font-semibold text-muted">
                                                {s.requests} kez istendi
                                            </span>
                                            {s.plays > 0 && <span>{s.plays} kez çalındı</span>}
                                            {s.likes > 0 && (
                                                <span className="inline-flex items-center gap-1">
                                                    <ThumbsUp size={11} />
                                                    {s.likes}
                                                </span>
                                            )}
                                            {inList && (
                                                <span className="font-bold text-accent">Listede</span>
                                            )}
                                        </>
                                    }
                                    actions={
                                        <>
                                            <AskButton
                                                id={s.spotify_id}
                                                name={s.name}
                                                rejected={status === "rejected"}
                                            />
                                            <LyricsButton name={s.name} artists={s.artists} />
                                        </>
                                    }
                                />
                            );
                        })}
                    </ul>
                )}
            </div>
        </>
    );
}
