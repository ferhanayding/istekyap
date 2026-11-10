"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, ThumbsUp, X } from "lucide-react";
import type { HistorySong } from "@/lib/history-types";
import type { RequestStatus } from "@/lib/use-request-feed";
import { useSystem } from "@/lib/system-context";
import { useLive } from "@/lib/live-client";
import { sendRequest } from "@/lib/send-request";
import { fold } from "@/lib/fold";
import { LyricsButton } from "./LyricsSheet";
import LoadingTracks from "./LoadingTracks";
import { useToast } from "./Toast";

type Sort = "most" | "recent";

const CLOSED_TEXT = "İstekler şu an kapalı. Canlı müzik başlayınca açılacak.";

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
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [sent, setSent] = useState<ReadonlySet<string>>(new Set());
    const system = useSystem();
    const toast = useToast();

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

    async function ask(s: HistorySong) {
        if (!system.requestsOpen) {
            toast.error(CLOSED_TEXT);
            return;
        }
        setSendingId(s.spotify_id);
        const r = await sendRequest(s.spotify_id);
        setSendingId(null);
        if (!r.ok) {
            toast.error(r.error);
            return;
        }
        setSent((prev) => new Set(prev).add(s.spotify_id));
        toast.success(
            r.count
                ? `İsteğe katıldın · ${r.count} kişi istedi: ${s.name}`
                : `İstek gönderildi: ${s.name}`
        );
    }

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
                            const rejected = status === "rejected";
                            const done = sent.has(s.spotify_id);
                            const sending = sendingId === s.spotify_id;
                            const closed = !system.requestsOpen;

                            return (
                                <li
                                    key={s.spotify_id}
                                    id={`old-${s.spotify_id}`}
                                    className="flex items-center gap-3 py-2"
                                >
                                    {s.cover ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            loading={idx < 8 ? "eager" : "lazy"}
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
                                        <p className="truncate text-base font-medium text-ink">
                                            {s.name}
                                        </p>
                                        <p className="mt-0.5 truncate text-sm text-muted">
                                            {s.artists}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-faint">
                                            <span className="font-semibold text-muted">
                                                {s.requests} kez istendi
                                            </span>
                                            {s.plays > 0 && (
                                                <span>
                                                    {s.plays} kez çalındı
                                                </span>
                                            )}
                                            {s.likes > 0 && (
                                                <span className="inline-flex items-center gap-1">
                                                    <ThumbsUp size={11} />
                                                    {s.likes}
                                                </span>
                                            )}
                                            {inList && (
                                                <span className="font-bold text-accent">
                                                    Bu gece listede
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => ask(s)}
                                        disabled={done || rejected || sendingId !== null}
                                        aria-label={`${s.name} şarkısını iste`}
                                        className={`h-8 shrink-0 rounded-full px-3.5 text-xs font-extrabold transition enabled:active:scale-95 ${done
                                            ? "bg-accent/15 text-accent"
                                            : rejected || closed
                                                ? "bg-raised text-faint"
                                                : "bg-accent text-on-accent disabled:opacity-60"
                                            }`}
                                    >
                                        {done
                                            ? "İstendi"
                                            : rejected
                                                ? "Reddedildi"
                                                : sending
                                                    ? "…"
                                                    : "İste"}
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
