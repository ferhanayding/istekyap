"use client";

import { Mic, Music2 } from "lucide-react";
import { useLyrics } from "./LyricsSheet";
import EqBars from "./EqBars";

export default function MiniPlayer({
    title,
    cover,
    onClick,
}: {
    title: string | null;
    cover: string | null;
    onClick: () => void;
}) {
    const openLyrics = useLyrics();
    // Başlık "Şarkı · Sanatçı" biçiminde gelir
    const cut = title ? title.lastIndexOf(" · ") : -1;
    const name = title ? (cut > 0 ? title.slice(0, cut) : title) : "Şarkı";
    const artists = title && cut > 0 ? title.slice(cut + 3) : "";

    return (
        <div className="mx-2 mb-1.5 shrink-0 animate-[mini-in_0.3s_ease-out] rounded-lg bg-gradient-to-r from-[#3A2B8F] to-[#2A2060] shadow-[0_-10px_30px_-12px_#000] motion-reduce:animate-none">
            <div className="flex items-center gap-2 p-2">
                <button
                    type="button"
                    onClick={onClick}
                    aria-label={`Çalan şarkı: ${name}. Listede göster`}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                    {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={cover}
                            alt=""
                            width={40}
                            height={40}
                            className="size-10 shrink-0 rounded-[4px] object-cover"
                        />
                    ) : (
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-[4px] bg-white/10">
                            <Music2 size={18} />
                        </div>
                    )}
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-white">
                            {name}
                        </span>
                        <span className="flex items-center gap-1.5 truncate text-xs text-white/65">
                            <EqBars className="shrink-0" />
                            <span className="shrink-0 font-bold text-[#1ED760]">Çalıyor</span>
                            {artists && <span className="truncate">· {artists}</span>}
                        </span>
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => openLyrics({ name, artists })}
                    aria-label={`${name} şarkısının sözlerini aç`}
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs font-bold text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                    <Mic size={14} />
                    Sözler
                </button>
            </div>
        </div>
    );
}