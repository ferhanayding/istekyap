"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Play, Search, Square, X } from "lucide-react";
import type { Track } from "@/lib/spotify";
import { lyricsUrl } from "@/lib/lyrics";
import { useToast } from "../Toast";
import { LyricsButton } from "../LyricsSheet";

type Result = Track & { inPlaylist?: boolean };

export default function LyricsBar({
    nowPlaying,
    busy,
    onPlay,
    onStop,
}: {
    nowPlaying: string | null;
    busy: boolean;
    onPlay: (id: string, title: string) => void;
    onStop: () => void;
}) {
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

    // Yazmayı bırakınca 300 ms sonra Spotify'da ara (dashboard: her şey çıkar)
    useEffect(() => {
        if (q.length < 2) return;

        const ctrl = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(
                    `/api/search?scope=all&q=${encodeURIComponent(q)}`,
                    { signal: ctrl.signal }
                );
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

    function submit(e: FormEvent) {
        e.preventDefault();
        if (!q) return;
        window.open(lyricsUrl(q), "_blank", "noopener,noreferrer");
    }

    return (
        <div ref={rootRef} className="relative z-30 mb-2 shrink-0 px-5">
            <form
                onSubmit={submit}
                className="flex h-11 items-center gap-2 rounded-full border border-accent/60 bg-raised px-4 transition focus-within:border-accent"
            >
                <Search size={17} className="shrink-0 text-muted" />
                <input
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                    placeholder="Şarkı ara: çal ya da sözlerine bak"
                    aria-label="Şarkı ara"
                    enterKeyHint="search"
                    autoComplete="off"
                    maxLength={150}
                    className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-faint"
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery("");
                            setOpen(false);
                        }}
                        aria-label="Temizle"
                        className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-line"
                    >
                        <X size={15} />
                    </button>
                )}
            </form>

            {active && (
                <div className="absolute inset-x-5 top-12 max-h-80 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-1.5 shadow-2xl">
                    {hasItems && (
                        <ul className={fresh ? "" : "opacity-60"}>
                            {result.items.map((t) => {
                                const playing = nowPlaying === t.id;
                                return (
                                    <li
                                        key={t.id}
                                        className={`flex items-center gap-2 rounded-xl p-2 transition ${playing ? "bg-accent/10" : "hover:bg-raised"
                                            }`}
                                    >
                                        {t.cover ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                loading="lazy"
                decoding="async"
                                                src={t.cover}
                                                alt=""
                                                width={40}
                                                height={40}
                                                className="size-10 shrink-0 rounded-[4px] object-cover"
                                            />
                                        ) : (
                                            <div className="size-10 shrink-0 rounded-[4px] bg-line" />
                                        )}

                                        <span className="min-w-0 flex-1">
                                            <span
                                                className={`block truncate text-sm font-bold ${playing ? "text-accent" : ""
                                                    }`}
                                            >
                                                {t.name}
                                            </span>
                                            <span className="flex items-center gap-1.5 truncate text-xs text-muted">
                                                {t.inPlaylist && (
                                                    <span className="shrink-0 rounded bg-accent/15 px-1.5 text-xs font-extrabold uppercase text-accent">
                                                        Listemizde
                                                    </span>
                                                )}
                                                <span className="truncate">{t.artists}</span>
                                            </span>
                                        </span>

                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => {
                                                if (playing) onStop();
                                                else onPlay(t.id, `${t.name} · ${t.artists}`);
                                                setOpen(false);
                                            }}
                                            aria-label={
                                                playing ? `${t.name} durdur` : `${t.name} çal`
                                            }
                                            className={`flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-extrabold transition active:scale-95 disabled:opacity-50 ${playing
                                                ? "bg-danger/20 text-danger"
                                                : "bg-accent text-on-accent"
                                                }`}
                                        >
                                            {playing ? (
                                                <Square size={11} fill="currentColor" />
                                            ) : (
                                                <Play size={12} fill="currentColor" />
                                            )}
                                            {playing ? "Durdur" : "Çal"}
                                        </button>

                                        <LyricsButton name={t.name} artists={t.artists} onOpen={() => setOpen(false)} />
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {!hasItems && fresh && (
                        <p className="p-3 text-sm text-muted">Spotify&apos;da sonuç yok.</p>
                    )}
                    {!hasItems && !fresh && (
                        <p className="p-3 text-sm text-muted">Aranıyor…</p>
                    )}

                    <a
                        href={lyricsUrl(q)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpen(false)}
                        className="mt-1 block rounded-xl px-3 py-2.5 text-xs font-bold text-ink transition hover:bg-raised"
                    >
                        Bulamadın mı? Google&apos;da ara: “{q}”
                    </a>
                </div>
            )}
        </div>
    );
}
