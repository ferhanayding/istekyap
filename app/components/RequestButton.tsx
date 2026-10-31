"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Search, Sparkles, X } from "lucide-react";
import type { Track } from "@/lib/spotify";
import { REQUEST_SENT_EVENT } from "@/lib/use-request-feed";
type Result = Track & { inPlaylist?: boolean };

const SEND_ERROR = "İstek gönderilemedi. Tekrar dokun.";

export default function RequestButton() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [result, setResult] = useState<{ q: string; items: Result[] } | null>(
        null
    );
    const [failedQ, setFailedQ] = useState<string | null>(null);
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);
    const [sent, setSent] = useState<Track | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const q = query.trim();
    const active = open && !sent && q.length >= 2;
    const fresh = result?.q === q;
    const hasItems = !!result && result.items.length > 0;

    function openPanel() {
        setQuery("");
        setResult(null);
        setFailedQ(null);
        setSendError(null);
        setSent(null);
        setOpen(true);
    }

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    // Yazmayı bırakınca 300 ms sonra ara
    useEffect(() => {
        if (!open || sent || q.length < 2) return;

        const ctrl = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
                    signal: ctrl.signal,
                });
                const data: unknown = await res.json();
                if (!res.ok || !Array.isArray(data)) throw new Error();
                setResult({ q, items: data as Result[] });
            } catch (e) {
                if ((e as Error).name !== "AbortError") setFailedQ(q);
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            ctrl.abort();
        };
    }, [q, open, sent]);

    async function pick(t: Track) {
        setSendingId(t.id);
        setSendError(null);
        try {
            const res = await fetch("/api/requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: t.id }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                setSendError(data?.error ?? SEND_ERROR);
                return;
            }
            setSent(t);
            window.dispatchEvent(new Event(REQUEST_SENT_EVENT));
            setTimeout(() => setOpen(false), 2200);
        } catch {
            setSendError(SEND_ERROR);
        } finally {
            setSendingId(null);
        }
    }

    return (
        <section className="relative z-20 shrink-0 px-5">
            <div className="relative h-12">
                {/* Buton */}
                <button
                    type="button"
                    onClick={openPanel}
                    inert={open}
                    className={`absolute inset-0 flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-[#7555E9] to-[#5A3FC0] px-4 text-sm font-extrabold shadow-[0_10px_30px_-14px_#795BFF] transition duration-300 ease-out motion-reduce:transition-none ${open ? "scale-95 opacity-0" : "opacity-100 active:scale-[0.98]"
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <Sparkles size={17} className="text-[#E5D9FF]" />
                        İstek Parça Yap
                    </span>
                    <ChevronRight size={18} className="text-white/70" />
                </button>

                {/* Arama kutusu */}
                <div
                    inert={!open}
                    className={`absolute inset-0 flex items-center gap-2 rounded-2xl border border-[#9B80FF]/40 bg-[#1E1A3D] px-3 shadow-[0_10px_30px_-14px_#795BFF] transition duration-300 ease-out motion-reduce:transition-none ${open ? "scale-x-100 opacity-100" : "scale-x-90 opacity-0"
                        }`}
                >
                    {sent ? (
                        <>
                            <Check size={18} className="shrink-0 text-[#37D9BD]" />
                            <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                                İstek gönderildi: {sent.name}
                            </p>
                        </>
                    ) : (
                        <>
                            <Search size={18} className="shrink-0 text-[#A99EC9]" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                                placeholder="Şarkı adı yaz"
                                aria-label="Şarkı ara"
                                maxLength={100}
                                className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-[#7E769B]"
                            />
                        </>
                    )}
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        aria-label="Kapat"
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#A99EC9] transition hover:bg-white/10"
                    >
                        <X size={17} />
                    </button>
                </div>

                {/* Öneriler */}
                {active && (
                    <div className="absolute inset-x-0 top-14 max-h-72 overflow-y-auto overscroll-contain rounded-2xl border border-white/[0.08] bg-[#1B1733] p-1.5 shadow-2xl">
                        {hasItems && (
                            <ul className={fresh ? "" : "opacity-60"}>
                                {result.items.map((t) => (
                                    <li key={t.id}>
                                        <button
                                            type="button"
                                            onClick={() => pick(t)}
                                            disabled={t.inPlaylist || sendingId !== null}
                                            className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition enabled:hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {t.cover ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={t.cover}
                                                    alt=""
                                                    width={40}
                                                    height={40}
                                                    className={`size-10 shrink-0 rounded-lg object-cover ${t.inPlaylist ? "grayscale" : ""
                                                        }`}
                                                />
                                            ) : (
                                                <div className="size-10 shrink-0 rounded-lg bg-white/10" />
                                            )}
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-bold">
                                                    {t.name}
                                                </span>
                                                <span className="block truncate text-xs text-[#89839F]">
                                                    {t.artists}
                                                </span>
                                            </span>
                                            <span
                                                className={`shrink-0 text-xs font-bold ${t.inPlaylist ? "text-[#89839F]" : "text-[#B9A6FF]"
                                                    }`}
                                            >
                                                {t.inPlaylist
                                                    ? "Playlistte var"
                                                    : sendingId === t.id
                                                        ? "Gönderiliyor…"
                                                        : "İste"}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {!hasItems && fresh && (
                            <p className="p-3 text-sm text-[#89839F]">
                                Sonuç yok. Şarkı adını farklı yazmayı dene.
                            </p>
                        )}
                        {!hasItems && !fresh && failedQ !== q && (
                            <p className="p-3 text-sm text-[#89839F]">Aranıyor…</p>
                        )}
                        {failedQ === q && (
                            <p className="p-3 text-sm text-[#FF729B]">
                                Arama yapılamadı. Biraz sonra tekrar dene.
                            </p>
                        )}
                        {sendError && (
                            <p className="p-3 text-sm text-[#FF729B]">{sendError}</p>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}