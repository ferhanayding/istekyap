"use client";

import { memo } from "react";
import type { Track } from "@/lib/spotify";
import type { MyVote } from "@/lib/use-votes";
import { addedInfo } from "@/lib/added";
import { LyricsButton } from "./LyricsSheet";
import EqBars from "./EqBars";
import VoteButtons from "./VoteButtons";

// memo: oylar ya da çalan şarkı değişince sadece etkilenen satırlar yeniden çizilir
export default memo(function TrackItem({
    track: t,
    likes,
    mine,
    onVote,
    played,
    votingOpen,
    playing,
    now,
    eager = false,
}: {
    track: Track;
    likes: number;
    mine: MyVote;
    onVote: (id: string, value: 1 | -1) => void;
    played: boolean;
    votingOpen: boolean;
    playing: boolean;
    now: number;
    /** İlk ekranda görünenler hemen, gerisi kaydırdıkça yüklenir */
    eager?: boolean;
}) {
    const added = addedInfo(t.addedAt, now);

    return (
        <div id={`track-${t.id}`} className="flex items-center gap-3 py-2">
            {t.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={t.cover}
                    alt={`${t.album} kapağı`}
                    width={56}
                    height={56}
                    loading={eager ? "eager" : "lazy"}
                    decoding="async"
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
                    <p className="truncate text-[11px] text-[#7C7794]">
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

            <LyricsButton name={t.name} artists={t.artists} />
        </div>
    );
});