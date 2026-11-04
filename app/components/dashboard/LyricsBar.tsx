"use client";

import { useEffect, useRef, useState } from "react";
import { Music2, Search, X } from "lucide-react";
import type { Track } from "@/lib/spotify";
import { lyricsUrl } from "@/lib/lyrics";
import { useToast } from "../Toast";

type Result = Track & { inPlaylist?: boolean };

export default function LyricsBar() {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState<{ q: string; items: Result[] } | null>(
        null
    );
    const [failedQ, setFailedQ] = useState<string | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const toast = useToast();

    const q = query.trim();
    const active = open && q.length >= 2 && failedQ !== q;
    const fresh = result?.q === q;
    const hasItems = !!result && result.items.length > 0;

    // Yazmayı bırakınca 300 ms sonra Spotify'da ara
    useEffect(() => {
        if (q.length < 2) return;

        const ctrl = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
                    signal: ctrl.signal,
                });
                const data: unknown = await res.json();
                if (!res.ok || !Array.isArray(data)) {
                    const msg = (data as { error?: string } | null)?.error;
                    throw new Error(msg);
                }
                setResult({ q, items: data as Result[] });
            } catch (e) {
                if ((e as Error).name !== "AbortError") {
                    setFailedQ(q);
                    toast.error(
                        (e as Error).message || "Arama yapılamadı. Biraz sonra tekrar dene."
                    );
                }
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            ctrl.abort();
        };
    }, [q, toast]);

    // Çubuğun dışına basınca liste kapansın
    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", onDown);
        return () => document.removeEventListener("pointerdown", onDown);
    }, [open]);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!q) return;
        window.open(lyricsUrl(q), "_blank", "noopener,noreferrer");
    }

    return (
        <div ref={rootRef} className="relative z-30 mb-3 shrink-0">
            <form
                onSubmit={submit}
                className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#1E1A3D] px-3 transition focus-within:border-[#9B80FF]/60"
            >
                <Search size={16} className="shrink-0 text-[#A99EC9]" />
                <input
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                    placeholder="Şarkı sözü ara: şarkı adı yaz"
                    aria-label="Sözleri aranacak şarkı"
                    enterKeyHint="search"
                    autoComplete="off"
                    maxLength={150}
                    className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-[#7E769B]"
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery("");
                            setOpen(false);
                        }}
                        aria-label="Temizle"
                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[#A99EC9]"
                    >
                        <X size={13} />
                    </button>
                )}
            </form>

            {active && (
                <div className="absolute inset-x-0 top-12 max-h-72 overflow-y-auto overscroll-contain rounded-2xl border border-white/[0.08] bg-[#1B1733] p-1.5 shadow-2xl">
                    {hasItems && (
                        <ul className={fresh ? "" : "opacity-60"}>
                            {result.items.map((t) => (
                                <li key={t.id}>
                                    <a
                                        href={lyricsUrl(t.name, t.artists)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => setOpen(false)}
                                        className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/[0.06]"
                                    >
                                        {t.cover ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={t.cover}
                                                alt=""
                                                width={36}
                                                height={36}
                                                className="size-9 shrink-0 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="size-9 shrink-0 rounded-lg bg-white/10" />
                                        )}
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-bold">
                                                {t.name}
                                            </span>
                                            <span className="block truncate text-xs text-[#89839F]">
                                                {t.artists}
                                            </span>
                                        </span>
                                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#8C70FF]/15 px-2.5 py-1 text-xs font-bold text-[#AA96FF]">
                                            <Music2 size={12} />
                                            Sözler
                                        </span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}

                    {!hasItems && fresh && (
                        <p className="p-3 text-sm text-[#89839F]">Spotify&apos;da sonuç yok.</p>
                    )}
                    {!hasItems && !fresh && (
                        <p className="p-3 text-sm text-[#89839F]">Aranıyor…</p>
                    )}

                    <a
                        href={lyricsUrl(q)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpen(false)}
                        className="mt-1 block rounded-xl px-3 py-2.5 text-xs font-bold text-[#B9A6FF] transition hover:bg-white/[0.06]"
                    >
                        Bulamadın mı? Google&apos;da ara: “{q}”
                    </a>
                </div>
            )}
        </div>
    );
}