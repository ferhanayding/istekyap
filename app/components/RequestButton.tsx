"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Lock, Plus, Search, ThumbsUp, X } from "lucide-react";
import type { Track } from "@/lib/spotify";
import { BLOCKED_MESSAGE, isBlocked } from "@/lib/blocklist";
import { useSystem } from "@/lib/system-context";
import { sendRequest } from "@/lib/send-request";
import { limitNote } from "@/lib/request-limit";
import { useToast } from "./Toast";

type Result = Track & { inPlaylist?: boolean };
// Öneri: bugüne kadar en çok beğenilenler (app/api/suggestions)
type Suggestion = Pick<Track, "id" | "name" | "artists" | "cover"> & {
    likes: number;
    inPlaylist?: boolean;
};
type Row = Pick<Track, "id" | "name" | "artists" | "cover"> & {
    likes?: number;
    inPlaylist?: boolean;
};
const SUGGESTION_COUNT = 8;

export default function RequestButton() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [result, setResult] = useState<{ q: string; items: Result[] } | null>(
        null
    );
    const [failedQ, setFailedQ] = useState<string | null>(null);
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [sent, setSent] = useState<Row | null>(null);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [sentCount, setSentCount] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { loaded, requestsOpen, played, nowPlaying, requestLimit, requestWindowMin } =
        useSystem();
    // Sınır dashboard'dan ayarlanır, not da ona göre yazılır
    const note = limitNote(requestLimit, requestWindowMin);
    const toast = useToast();
    const closed = loaded && !requestsOpen;

    const q = query.trim();
    // Küfürlü/müstehcen kelimeler aranmaz, sunucuya da gitmez
    const blocked = q.length >= 2 && isBlocked(q);
    // Arama başarısız olunca kutu boş kalmasın, hata toast olarak gelir
    const active =
        open && !sent && q.length >= 2 && (blocked || failedQ !== q);
    const fresh = result?.q === q;
    const hasItems = !!result && result.items.length > 0;
    // Bu gece çalınanlar ve şu an çalan önerilmez
    const suggested = suggestions
        .filter((t) => !played.has(t.id) && t.id !== nowPlaying)
        .slice(0, SUGGESTION_COUNT);

    function openPanel() {
        setQuery("");
        setResult(null);
        setFailedQ(null);
        setSent(null);
        setOpen(true);
    }

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    // Kutu her açıldığında öneriler tazelenir (cevap CDN'den gelir, veritabanı yorulmaz).
    // Alınamazsa sessiz geçilir: kutu önerisiz de çalışır.
    useEffect(() => {
        if (!open) return;
        const ctrl = new AbortController();
        fetch("/api/suggestions", { signal: ctrl.signal })
            .then((res) => (res.ok ? res.json() : []))
            .then((data: unknown) => {
                if (Array.isArray(data)) setSuggestions(data as Suggestion[]);
            })
            .catch(() => {});
        return () => ctrl.abort();
    }, [open]);

    // Yazmayı bırakınca 300 ms sonra ara
    useEffect(() => {
        if (!open || sent || q.length < 2 || blocked) return;

        const ctrl = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
                    signal: ctrl.signal,
                });
                const data: unknown = await res.json();
                if (!res.ok || !Array.isArray(data)) {
                    throw new Error((data as { error?: string } | null)?.error);
                }
                setResult({ q, items: data as Result[] });
            } catch (e) {
                if ((e as Error).name !== "AbortError") {
                    setFailedQ(q);
                    toast.error(
                        (e as Error).message ||
                        "Arama yapılamadı. Biraz sonra tekrar dene."
                    );
                }
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            ctrl.abort();
        };
    }, [q, open, sent, blocked, toast]);

    async function pick(t: Row) {
        setSendingId(t.id);
        const r = await sendRequest(t.id);
        setSendingId(null);
        if (!r.ok) {
            toast.error(r.error);
            return;
        }
        setSentCount(r.count);
        setSent(t);
        setTimeout(() => setOpen(false), 2200);
    }

    // Arama sonucunda da öneride de aynı satır
    function row(t: Row) {
        return (
                <li key={t.id}>
                    <button
                        type="button"
                        onClick={() => pick(t)}
                        disabled={played.has(t.id) || sendingId !== null}
                        className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition enabled:hover:bg-raised disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {t.cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={t.cover}
                                alt=""
                                width={40}
                                height={40}
                                className="size-10 shrink-0 rounded-lg object-cover"
                            />
                        ) : (
                            <div className="size-10 shrink-0 rounded-lg bg-line" />
                        )}
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">
                                {t.name}
                            </span>
                            <span className="block truncate text-xs text-muted">
                                {t.artists}
                            </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                            {t.likes ? (
                                <span className="flex items-center gap-1 text-xs font-bold text-muted">
                                    <ThumbsUp size={12} />
                                    {t.likes}
                                </span>
                            ) : null}
                            {t.inPlaylist && !t.likes && (
                                <span className="rounded bg-raised px-1.5 py-px text-xs font-bold text-muted">
                                    Listemizde
                                </span>
                            )}
                            <span
                                className={`text-xs font-bold ${played.has(t.id)
                                    ? "text-muted"
                                    : "rounded-full bg-accent px-2.5 py-1 text-on-accent"
                                    }`}
                            >
                                {played.has(t.id)
                                    ? "Çalındı"
                                    : sendingId === t.id
                                        ? "Gönderiliyor…"
                                        : "İste"}
                            </span>
                        </span>
                    </button>
                </li>
        );
    }

    // Durum gelmeden butonu gösterme: önce açık görünüp sonra "kapalı"ya dönmesin
    if (!loaded) {
        return (
            <section className="relative z-20 shrink-0 px-5" aria-busy="true">
                <div className="h-10 animate-pulse rounded-full bg-raised" />
            </section>
        );
    }

    return (
        <section className="relative z-20 shrink-0 px-5">
            <div className="relative h-10">
                {/* Buton */}
                <button
                    type="button"
                    onClick={openPanel}
                    inert={open}
                    disabled={!loaded || !requestsOpen}
                    className={`absolute inset-0 flex w-full items-center justify-between rounded-full px-5 text-sm font-extrabold transition duration-300 ease-out motion-reduce:transition-none ${closed
                        ? "cursor-not-allowed bg-raised text-muted"
                        : "bg-accent text-on-accent disabled:opacity-70"
                        } ${open ? "scale-95 opacity-0" : "opacity-100 enabled:active:scale-[0.98]"
                        }`}
                >
                    <span className="flex items-center gap-2">
                        {closed ? (
                            <Lock size={17} />
                        ) : (
                            <Plus size={18} strokeWidth={2.5} className="text-on-accent" />
                        )}
                        {closed ? "İstekler şu an kapalı" : "İstek Parça Yap"}
                    </span>
                    {!closed && <ChevronRight size={18} className="text-on-accent/60" />}
                </button>

                {/* Arama kutusu */}
                <div
                    inert={!open}
                    className={`absolute inset-0 flex items-center gap-2 rounded-full bg-raised px-4 transition duration-300 ease-out motion-reduce:transition-none ${open ? "scale-x-100 opacity-100" : "scale-x-90 opacity-0"
                        }`}
                >
                    {sent ? (
                        <>
                            <Check size={18} className="shrink-0 text-accent" />
                            <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                                {sentCount
                                    ? `İsteğe katıldın · ${sentCount} kişi istedi: ${sent.name}`
                                    : `İstek gönderildi: ${sent.name}`}
                            </p>
                        </>
                    ) : (
                        <>
                            <Search size={18} className="shrink-0 text-muted" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                                placeholder="Şarkı adı yaz"
                                aria-label="Şarkı ara"
                                maxLength={100}
                                className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-faint"
                            />
                        </>
                    )}
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        aria-label="Kapat"
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-line"
                    >
                        <X size={17} />
                    </button>
                </div>

                {/* Kutu açık ama henüz yazılmadı: kuralı göster */}
                {open && !sent && !active && suggested.length === 0 && (
                    <p className="absolute inset-x-0 top-11 rounded-2xl border border-line bg-surface px-4 py-3 text-xs text-muted shadow-2xl">
                        {note}
                    </p>
                )}

                {/* Henüz yazılmadı: en çok beğenilenler önerilir */}
                {open && !sent && !active && suggested.length > 0 && (
                    <div className="absolute inset-x-0 top-11 max-h-72 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-1.5 shadow-2xl">
                        <p className="px-2 pb-1 pt-1.5 text-xs font-bold uppercase tracking-wider text-faint">
                            En çok beğenilenler
                        </p>
                        <ul>{suggested.map(row)}</ul>
                        <p className="border-t border-line px-3 pb-1.5 pt-2.5 text-xs text-faint">
                            {note}
                        </p>
                    </div>
                )}

                {/* Öneriler */}
                {active && (
                    <div className="absolute inset-x-0 top-11 max-h-72 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-1.5 shadow-2xl">
                        {blocked ? (
                            <p role="alert" className="p-3 text-sm text-danger">
                                {BLOCKED_MESSAGE}
                            </p>
                        ) : (
                            <>
                                {hasItems && (
                                    <ul className={fresh ? "" : "opacity-60"}>
                                        {result.items.map(row)}
                                    </ul>
                                )}

                                {!hasItems && fresh && (
                                    <p className="p-3 text-sm text-muted">
                                        Sonuç yok. Şarkı adını farklı yazmayı dene.
                                    </p>
                                )}
                                {!hasItems && !fresh && (
                                    <p className="p-3 text-sm text-muted">Aranıyor…</p>
                                )}
                                <p className="border-t border-line px-3 pb-1.5 pt-2.5 text-xs text-faint">
                                    {note}
                                </p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
