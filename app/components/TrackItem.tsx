"use client";

import { memo } from "react";
import type { Track } from "@/lib/spotify";
import type { MyVote } from "@/lib/use-votes";
import { addedInfo } from "@/lib/added";
import { LyricsButton } from "./LyricsSheet";
import AskButton from "./AskButton";
import EqBars from "./EqBars";
import SongRow from "./SongRow";
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
        <SongRow
            id={`track-${t.id}`}
            cover={t.cover}
            coverAlt={`${t.album} kapağı`}
            name={t.name}
            artists={t.artists}
            playing={playing}
            eager={eager}
            meta={
                playing ? (
                    <span className="inline-flex items-center gap-1.5 font-bold text-accent">
                        <EqBars />
                        Çalıyor
                    </span>
                ) : (
                    <>
                        {played && (
                            <span className="rounded-full bg-raised px-2 py-px font-bold text-ink">
                                Çalındı
                            </span>
                        )}
                        {added?.isNew && (
                            <span className="rounded bg-accent px-1.5 font-extrabold uppercase text-on-accent">
                                Yeni
                            </span>
                        )}
                        {added && <span className="truncate">{added.label}</span>}
                    </>
                )
            }
            actions={
                <>
                    {/* Oy sadece çalınmış şarkılara */}
                    {played && (
                        <VoteButtons
                            id={t.id}
                            name={t.name}
                            likes={likes}
                            mine={mine}
                            played={played}
                            votingOpen={votingOpen}
                            onVote={onVote}
                        />
                    )}
                    {/* Çalınmış şarkı bu gece tekrar istenemez: rozet yeterli, buton yerine oy */}
                    {!played && <AskButton id={t.id} name={t.name} />}
                    <LyricsButton name={t.name} artists={t.artists} />
                </>
            }
        />
    );
});
