"use client";

import { useEffect, useState } from "react";
import type { LastNightResponse } from "@/lib/visitor-types";
import { LyricsButton } from "./LyricsSheet";
import SongRow from "./SongRow";

const DAY_FMT = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    weekday: "long",
});

// Gece kapalıyken: son gecede çaldığımız şarkılar (çalınma sırasıyla)
export default function LastNight() {
    const [data, setData] = useState<LastNightResponse | null>(null);

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
            <h2 className="text-sm font-extrabold text-ink">Son gecede çaldıklarımız</h2>
            <p className="mt-0.5 text-xs text-faint">
                {DAY_FMT.format(new Date(data.date))} · {data.songs.length} şarkı
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
                        meta={<span>{idx + 1}. şarkı</span>}
                        actions={<LyricsButton name={s.name} artists={s.artists} />}
                    />
                ))}
            </ul>
        </section>
    );
}
