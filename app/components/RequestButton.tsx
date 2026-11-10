"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Lock, Search, Sparkles, X } from "lucide-react";
import type { Track } from "@/lib/spotify";
import { BLOCKED_MESSAGE, isBlocked } from "@/lib/blocklist";
import { useSystem } from "@/lib/system-context";
import { useToast } from "./Toast";

type Requested = "pending" | "approved" | "rejected" | null;
type Result = Track & { inPlaylist?: boolean; requested?: Requested };

const SEND_ERROR = "İstek gönderilemedi. Tekrar dokun.";

// İstek listesinde zaten olan şarkının sağ tarafında görünen yazı
const REQUESTED_LABEL: Record<Exclude<Requested, null>, string> = {
    pending: "İstendi",
    approved: "Onaylandı",
    rejected: "Reddedildi",
};

// Sunucudaki sınırla aynı (app/api/requests: cihaz başına 10 dakikada 5)
const LIMIT_NOTE = "Her cihazdan 10 dakikada en fazla 5 istek atılabilir.";

export default function RequestButton() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [result, setResult] = useState<{ q: string; items: Result[] } | null>(
        null
    );
    const [failedQ, setFailedQ] = useState<string | null>(null);
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [sent, setSent] = useState<Track | null>(null);
    const [sentCount, setSentCount] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { loaded, requestsOpen } = useSystem();
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

    async function pick(t: Track) {
        setSendingId(t.id);
        try {
            const res = await fetch("/api/requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: t.id }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                toast.error(data?.error ?? SEND_ERROR);
                return;
            }
            const data = await res.json().catch(() => null);
            setSentCount(data?.joined ? Number(data.count) || null : null);
            setSent(t);
            setTimeout(() => setOpen(false), 2200);
        } catch {
            toast.error(SEND_ERROR);
        } finally {
            setSendingId(null);
        }
    }

    // Durum gelmeden butonu gösterme: önce açık görünüp sonra "kapalı"ya dönmesin
    if (!loaded) {
        return (
            <section className="relative z-20 shrink-0 px-5" aria-busy="true">
                <div className="h-11 animate-pulse rounded-full bg-white/[0.07]" />
            </section>
        );
    }

    return (
        <section className="relative z-20 shrink-0 px-5">
            <div className="relative h-11">
                {/* Buton */}
                <button
                    type="button"
                    onClick={openPanel}
                    inert={open}
                    disabled={!loaded || !requestsOpen}
                    className={`absolute inset-0 flex w-full items-center justify-between rounded-full px-5 text-sm font-extrabold transition duration-300 ease-out motion-reduce:transition-none ${closed
                        ? "cursor-not-allowed bg-white/[0.07] text-[#9A94B0]"
                        : "bg-[#1ED760] text-black shadow-[0_8px_24px_-12px_#1ED760] disabled:opacity-70"
                        } ${open ? "scale-95 opacity-0" : "opacity-100 enabled:active:scale-[0.98]"
                        }`}
                >
                    <span className="flex items-center gap-2">
                        {closed ? (
                            <Lock size={17} />
                        ) : (
                            <Sparkles size={17} className="text-black" />
                        )}
                        {closed ? "İstekler şu an kapalı" : "İstek Parça Yap"}
                    </span>
                    {!closed && <ChevronRight size={18} className="text-black/60" />}
                </button>

                {/* Arama kutusu */}
                <div
                    inert={!open}
                    className={`absolute inset-0 flex items-center gap-2 rounded-full border border-[#1ED760]/60 bg-[#1F1B33] px-4 transition duration-300 ease-out motion-reduce:transition-none ${open ? "scale-x-100 opacity-100" : "scale-x-90 opacity-0"
                        }`}
                >
                    {sent ? (
                        <>
                            <Check size={18} className="shrink-0 text-[#1ED760]" />
                            <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                                {sentCount
                                    ? `İsteğe katıldın · ${sentCount} kişi istedi: ${sent.name}`
                                    : `İstek gönderildi: ${sent.name}`}
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

                {/* Kutu açık ama henüz yazılmadı: kuralı göster */}
                {open && !sent && !active && (
                    <p className="absolute inset-x-0 top-12 rounded-2xl border border-white/[0.08] bg-[#1B1733] px-4 py-3 text-xs text-[#89839F] shadow-2xl">
                        {LIMIT_NOTE}
                    </p>
                )}

                {/* Öneriler */}
                {active && (
                    <div className="absolute inset-x-0 top-12 max-h-72 overflow-y-auto overscroll-contain rounded-2xl border border-white/[0.08] bg-[#1B1733] p-1.5 shadow-2xl">
                        {blocked ? (
                            <p role="alert" className="p-3 text-sm text-[#FF8FB0]">
                                {BLOCKED_MESSAGE}
                            </p>
                        ) : (
                            <>
                                {hasItems && (
                                    <ul className={fresh ? "" : "opacity-60"}>
                                        {result.items.map((t) => (
                                            <li key={t.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => pick(t)}
                                                    disabled={!!t.requested || sendingId !== null}
                                                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition enabled:hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
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
                                                    <span className="flex shrink-0 flex-col items-end gap-1">
                                                        {t.inPlaylist && (
                                                            <span className="rounded bg-[#1ED760]/15 px-1.5 py-px text-[10px] font-extrabold uppercase text-[#1ED760]">
                                                                Listemizde
                                                            </span>
                                                        )}
                                                        <span
                                                            className={`text-xs font-bold ${t.requested ? "text-[#89839F]" : "text-[#B9A6FF]"
                                                                }`}
                                                        >
                                                            {t.requested
                                                                ? REQUESTED_LABEL[t.requested]
                                                                : sendingId === t.id
                                                                    ? "Gönderiliyor…"
                                                                    : "İste"}
                                                        </span>
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
                                {!hasItems && !fresh && (
                                    <p className="p-3 text-sm text-[#89839F]">Aranıyor…</p>
                                )}
                                <p className="border-t border-white/[0.06] px-3 pb-1.5 pt-2.5 text-[11px] text-[#7C7794]">
                                    {LIMIT_NOTE}
                                </p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
