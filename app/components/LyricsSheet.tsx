"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { Mic, X } from "lucide-react";
import { lyricsUrl } from "@/lib/lyrics";

type Song = { name: string; artists: string };
type State =
    | { status: "loading" }
    | { status: "ok"; title: string; artist: string; lyrics: string }
    | { status: "missing"; instrumental: boolean }
    | { status: "error" };

const LyricsContext = createContext<(song: Song) => void>(() => {});

// Dashboard'un herhangi bir yerinden sözleri açar
export const useLyrics = () => useContext(LyricsContext);

export function LyricsProvider({ children }: { children: ReactNode }) {
    const [song, setSong] = useState<Song | null>(null);
    const open = useCallback((s: Song) => setSong(s), []);

    return (
        <LyricsContext.Provider value={open}>
            {children}
            {song && (
                <LyricsSheet
                    key={`${song.artists}|${song.name}`}
                    song={song}
                    onClose={() => setSong(null)}
                />
            )}
        </LyricsContext.Provider>
    );
}

function LyricsSheet({ song, onClose }: { song: Song; onClose: () => void }) {
    const [state, setState] = useState<State>({ status: "loading" });

    useEffect(() => {
        const ctrl = new AbortController();
        const params = new URLSearchParams({ name: song.name, artists: song.artists });
        fetch(`/api/lyrics?${params}`, { signal: ctrl.signal })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error();
                if (data.ok) {
                    setState({
                        status: "ok",
                        title: data.song.title,
                        artist: data.song.artist,
                        lyrics: data.song.lyrics,
                    });
                } else {
                    setState({ status: "missing", instrumental: data.reason === "instrumental" });
                }
            })
            .catch((e) => {
                if ((e as Error).name !== "AbortError") setState({ status: "error" });
            });
        return () => ctrl.abort();
    }, [song]);

    // Esc ile kapanır, arkadaki sayfa kaymaz
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    const title = state.status === "ok" ? state.title : song.name;
    const artist = state.status === "ok" ? state.artist : song.artists;
    const google = (
        <a
            href={lyricsUrl(song.name, song.artists)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex h-10 items-center rounded-full bg-white/[0.08] px-4 text-sm font-bold text-[#CFC4FF] transition hover:bg-white/[0.14]"
        >
            Google&apos;da ara
        </a>
    );

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`${song.name} şarkı sözleri`}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-6"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="flex h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-3xl border border-white/[0.08] bg-[#141124] shadow-2xl sm:h-[86dvh] sm:rounded-3xl"
            >
                <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] px-5 py-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1ED760]/15 text-[#1ED760]">
                        <Mic size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-extrabold text-white">{title}</p>
                        <p className="truncate text-xs text-[#B3B3B3]">{artist}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Kapat"
                        autoFocus
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-white transition hover:bg-white/[0.14]"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
                    {state.status === "loading" && (
                        <div className="space-y-3" aria-label="Sözler yükleniyor">
                            {[80, 65, 72, 50, 0, 76, 60, 70].map((w, i) => (
                                <div
                                    key={i}
                                    className="h-4 animate-pulse rounded bg-white/[0.07]"
                                    style={{ width: `${w}%`, opacity: w ? 1 : 0 }}
                                />
                            ))}
                        </div>
                    )}

                    {state.status === "ok" && (
                        <>
                            <p className="mb-5 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl bg-white/[0.05] px-3 py-2 text-xs text-[#9D97B8]">
                                Bu sözler
                                <a
                                    href="https://lrclib.net"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-bold text-[#CFC4FF] hover:underline"
                                >
                                    lrclib.net
                                </a>
                                adresinden alınmıştır.
                                <span aria-hidden>·</span>
                                <a
                                    href={lyricsUrl(song.name, song.artists)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-bold text-[#B9A6FF] hover:underline"
                                >
                                    Yanlışsa Google&apos;da ara
                                </a>
                            </p>
                            <LyricsText text={state.lyrics} />
                        </>
                    )}

                    {state.status === "missing" && (
                        <div className="py-10 text-center">
                            <p className="text-sm text-[#B3B3B3]">
                                {state.instrumental
                                    ? "Bu şarkı enstrümantal, sözü yok."
                                    : "Bu şarkının sözleri bulunamadı."}
                            </p>
                            {!state.instrumental && google}
                        </div>
                    )}

                    {state.status === "error" && (
                        <div className="py-10 text-center">
                            <p className="text-sm text-[#B3B3B3]">
                                Sözler şu an alınamadı.
                            </p>
                            {google}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

// Boş satırlar kıta arası boşluk olur; tamamı parantez içindeki satırlar
// (arka vokal, örn. "(Hey, hey, hey)") soluk ve italik görünür
function LyricsText({ text }: { text: string }) {
    const stanzas = text.split(/\n\s*\n/);
    return (
        <div className="space-y-6 text-lg leading-relaxed text-[#EDEAF7]">
            {stanzas.map((stanza, i) => (
                <p key={i}>
                    {stanza.split("\n").map((line, j) => {
                        const backing = /^\s*\(.*\)\s*$/.test(line);
                        return (
                            <span
                                key={j}
                                className={`block ${backing ? "italic text-[#9D97B8]" : ""}`}
                            >
                                {line}
                            </span>
                        );
                    })}
                </p>
            ))}
        </div>
    );
}
