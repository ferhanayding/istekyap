"use client";

import { useEffect, useState } from "react";
import type { LastNightResponse } from "@/lib/visitor-types";
import { formatDay, useT } from "@/lib/i18n";
import { useSystem } from "@/lib/system-context";
import { useSharedVotes } from "@/lib/votes-context";
import { LyricsButton } from "./LyricsSheet";
import SongRow from "./SongRow";
import VoteButtons from "./VoteButtons";


// Gece kapalıyken: son gecede çaldığımız şarkılar (çalınma sırasıyla)
export default function LastNight() {
    const [data, setData] = useState<LastNightResponse | null>(null);
    const t = useT();
    const { votes, vote } = useSharedVotes();
    const system = useSystem();

    useEffect(() => {
        const ctrl = new AbortController();
        fetch("/api/last-night", { signal: ctrl.signal })
            .then((res) => (res.ok ? res.json() : null))
            .then((d: LastNightResponse | null) => {
                if (d && Array.isArray(d.songs)) setData(d);
            })
            .catch(() => {});
        return () => ctrl.abort();
    }, []);

    // Alınamadıysa ya da hiç çalma kaydı yoksa bölüm hiç görünmez
    if (!data || !data.date || data.songs.length === 0) return null;

    return (
        <section className="mt-4">
            <h2 className="text-sm font-extrabold text-ink">{t("Son gecede çaldıklarımız")}</h2>
            <p className="mt-0.5 text-xs text-faint">
                {formatDay(t, data.date)} ·{" "}
                {t("{n} şarkı", { n: data.songs.length })}
            </p>
            <ul className="mt-1">
                {data.songs.map((s, idx) => (
                    <SongRow
                        key={s.id}
                        as="li"
                        cover={s.cover}
                        name={s.name}
                        artists={s.artists}
                        eager={idx < 6}
                        meta={<span>{t("{n}. şarkı", { n: idx + 1 })}</span>}
                        actions={
                            <>
                                <VoteButtons
                                    id={s.id}
                                    name={s.name}
                                    likes={votes[s.id]?.likes ?? 0}
                                    dislikes={votes[s.id]?.dislikes ?? 0}
                                    mine={votes[s.id]?.mine ?? 0}
                                    played={system.played.has(s.id)}
                                    votingOpen={system.votingOpen}
                                    onVote={vote}
                                />
                                <LyricsButton name={s.name} artists={s.artists} />
                            </>
                        }
                    />
                ))}
            </ul>
        </section>
    );
}
