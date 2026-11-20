"use client";

import { memo } from "react";
import type { Track } from "@/lib/spotify";
import type { MyVote } from "@/lib/use-votes";
import { addedInfo } from "@/lib/added";
import { useT } from "@/lib/i18n";
import { LyricsButton } from "./LyricsSheet";
import AskButton from "./AskButton";
import EqBars from "./EqBars";
import SongRow from "./SongRow";
import VoteButtons from "./VoteButtons";

// memo: oylar ya da çalan şarkı değişince sadece etkilenen satırlar yeniden çizilir
export default memo(function TrackItem({
    track: t,
    likes,
    dislikes,
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
    dislikes: number;
    mine: MyVote;
    onVote: (id: string, value: 1 | -1) => void;
    played: boolean;
    votingOpen: boolean;
    playing: boolean;
    now: number;
    /** İlk ekranda görünenler hemen, gerisi kaydırdıkça yüklenir */
    eager?: boolean;
}) {
    const tr = useT();
    const added = addedInfo(t.addedAt, now);

    return (
        <SongRow
            id={`track-${t.id}`}
            cover={t.cover}
            coverAlt={tr("{album} kapağı", { album: t.album })}
            name={t.name}
            artists={t.artists}
            playing={playing}
            eager={eager}
            // Tek rozet, en önemlisi: Çalıyor > Çalındı > Yeni (yan yana iki rozet butonları sıkıştırır)
            badges={
                playing ? (
                    <span className="inline-flex items-center gap-1.5 font-bold text-accent">
                        <EqBars />
                        {tr("Çalıyor")}
                    </span>
                ) : played ? (
                    <span className="rounded-full bg-raised px-2 py-px font-bold text-ink">
                        {tr("Çalındı")}
                    </span>
                ) : added?.isNew ? (
                    <span className="rounded bg-accent px-1 font-extrabold uppercase text-on-accent">
                        {tr("Yeni")}
                    </span>
                ) : null
            }
            // Eklenme tarihi "Yeni" rozetinin altında
            meta={added && <span className="truncate">{tr(added.key, { n: added.n })}</span>}
            actions={
                <>
                    {/* Her zaman görünür: oy sadece bu gece çalınınca verilir */}
                    <VoteButtons
                        id={t.id}
                        name={t.name}
                        likes={likes}
                        dislikes={dislikes}
                        mine={mine}
                        played={played}
                        votingOpen={votingOpen}
                        onVote={onVote}
                    />
                    {/* Çalınmış şarkı bu gece tekrar istenemez: "Çalındı" rozeti yeterli */}
                    {!played && (
                        <AskButton id={t.id} name={t.name} artists={t.artists} cover={t.cover} />
                    )}
                    <LyricsButton name={t.name} artists={t.artists} />
                </>
            }
        />
    );
});
