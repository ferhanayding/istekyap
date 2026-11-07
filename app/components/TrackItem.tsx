"use client";

import { Mic } from "lucide-react";
import type { Track } from "@/lib/spotify";
import type { MyVote } from "@/lib/use-votes";
import { addedInfo } from "@/lib/added";
import { useLyrics } from "./LyricsSheet";
import EqBars from "./EqBars";
import VoteButtons from "./VoteButtons";

export default function TrackItem({
    track: t,
    likes,
    mine,
    onVote,
    played,
    votingOpen,
    playing,
}: {
    track: Track;
    likes: number;
    mine: MyVote;
    onVote: (id: string, value: 1 | -1) => void;
    played: boolean;
    votingOpen: boolean;
    playing: boolean;
}) {
    const openLyrics = useLyrics();
    const added = addedInfo(t.addedAt);

    return (
        <div id={`track-${t.id}`} className="flex items-center gap-3 py-2">
            {t.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={t.cover}
                    alt={`${t.album} kapağı`}
                    width={56}
                    height={56}
                    className="size-14 shrink-0 rounded-[4px] object-cover"
                />
            ) : (
                <div className="size-14 shrink-0 rounded-[4px] bg-white/10" />
            )}

            <div className="min-w-0 flex-1">
                <p
                    className={`truncate text-base ${playing ? "font-bold text-[#1ED760]" : "font-medium text-white"
                        }`}
                >
                    {t.name}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-[#B3B3B3]">
                    {playing && <EqBars className="shrink-0" />}
                    {!playing && added?.isNew && (
                        <span className="shrink-0 rounded bg-[#1ED760] px-1.5 text-[10px] font-extrabold uppercase text-black">
                            Yeni
                        </span>
                    )}
                    <span className="truncate">{t.artists}</span>
                </p>
                {added && (
                    <p
                        className="truncate text-[11px] text-[#7C7794]"
                        suppressHydrationWarning
                    >
                        {added.label}
                    </p>
                )}
            </div>

            <VoteButtons
                id={t.id}
                name={t.name}
                likes={likes}
                mine={mine}
                played={played}
                votingOpen={votingOpen}
                onVote={onVote}
            />

            <button
                type="button"
                onClick={() => openLyrics({ name: t.name, artists: t.artists })}
                title="Sözler"
                aria-label={`${t.name} şarkısının sözlerini aç`}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#B3B3B3] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9B80FF]"
            >
                <Mic size={17} />
            </button>
        </div>
    );
}