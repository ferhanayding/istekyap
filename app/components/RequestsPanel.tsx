"use client";

import { useEffect } from "react";
import { Mic } from "lucide-react";
import { type RequestFeed, type RequestStatus } from "@/lib/use-request-feed";
import { useSystem } from "@/lib/system-context";
import { useSharedVotes } from "@/lib/votes-context";
import { useLyrics } from "./LyricsSheet";
import EqBars from "./EqBars";
import LoadingTracks from "./LoadingTracks";
import { useToast } from "./Toast";
import VoteButtons from "./VoteButtons";

const rtf = new Intl.RelativeTimeFormat("tr", { numeric: "auto" });

const BADGE: Record<RequestStatus, { text: string; className: string }> = {
    pending: { text: "Bekliyor", className: "bg-white/[0.09] text-[#B3B3B3]" },
    approved: {
        text: "Onaylandı · Çalınacak",
        className: "bg-[#1ED760]/15 text-[#1ED760]",
    },
    played: { text: "Çalındı", className: "bg-[#9B80FF]/20 text-[#C3B3FF]" },
    rejected: { text: "Reddedildi", className: "bg-[#FF729B]/15 text-[#FF729B]" },
};

function ago(iso: string, now: number): string {
    // Telefonun saati geride kalırsa "gelecekte" görünmesin
    const s = Math.min(0, Math.round((new Date(iso).getTime() - now) / 1000));
    if (Math.abs(s) < 60) return "az önce";
    const m = Math.round(s / 60);
    if (Math.abs(m) < 60) return rtf.format(m, "minute");
    const h = Math.round(m / 60);
    if (Math.abs(h) < 24) return rtf.format(h, "hour");
    return rtf.format(Math.round(h / 24), "day");
}

export default function RequestsPanel({ feed }: { feed: RequestFeed }) {
    const { items, failed, now, live } = feed;
    const system = useSystem();
    const { votes, vote } = useSharedVotes();
    const toast = useToast();
    const openLyrics = useLyrics();
    const pendingCount = items?.filter((r) => r.status === "pending").length;

    useEffect(() => {
        if (failed) toast.error("Liste güncellenemedi, tekrar denenecek.");
    }, [failed, toast]);

    return (
        <section className="relative mt-3 flex min-h-0 flex-1 flex-col px-5">
            <div className="mb-1 flex shrink-0 items-baseline justify-between">
                <h2 className="text-lg font-extrabold tracking-tight">İstek Listesi</h2>
                <span className="text-xs text-[#8F8AA8]">
                    {items ? `${pendingCount} bekleyen` : "…"}
                    {live && (
                        <span className="ml-1.5 inline-flex items-center gap-1 text-[#1ED760]">
                            · <span className="h-1.5 w-1.5 rounded-full bg-[#1ED760]" aria-hidden />
                            canlı
                        </span>
                    )}
                </span>
            </div>

            <div
                data-scroll-list
                className="-mx-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 [scrollbar-color:#3A3270_transparent] [scrollbar-width:thin]"
            >
                {items === null ? (
                    <LoadingTracks />
                ) : items.length === 0 ? (
                    <p className="mt-2 rounded-lg bg-white/[0.05] p-4 text-sm text-[#B3B3B3]">
                        Henüz istek yok. Yukarıdaki butondan ilk isteği sen yap.
                    </p>
                ) : (
                    <ul>
                        {items.map((r) => {
                            const badge = BADGE[r.status] ?? BADGE.pending;
                            const rejected = r.status === "rejected";
                            const playing = system.nowPlaying === r.spotify_id;

                            // Onaylı ve çalınmış istekler oylanabilir
                            const voteable = r.status === "approved" || r.status === "played";
                            const wasPlayed =
                                r.status === "played" || system.played.has(r.spotify_id);

                            return (
                                <li
                                    key={r.id}
                                    id={`req-${r.spotify_id}`}
                                    className={`flex items-center gap-3 py-2 ${rejected ? "opacity-60" : ""
                                        }`}
                                >
                                    {r.cover ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={r.cover}
                                            alt=""
                                            width={56}
                                            height={56}
                                            className={`size-14 shrink-0 rounded-[4px] object-cover ${rejected ? "grayscale" : ""
                                                }`}
                                        />
                                    ) : (
                                        <div className="size-14 shrink-0 rounded-[4px] bg-white/10" />
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <p
                                            className={`truncate text-base ${playing
                                                ? "font-bold text-[#1ED760]"
                                                : "font-medium text-white"
                                                }`}
                                        >
                                            {r.name}
                                        </p>
                                        <p className="mt-0.5 truncate text-sm text-[#B3B3B3]">
                                            {r.artists}
                                        </p>
                                        <div className="mt-1 flex items-center gap-2">
                                            {playing ? (
                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#1ED760]">
                                                    <EqBars />
                                                    Çalıyor
                                                </span>
                                            ) : (
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.className}`}
                                                >
                                                    {badge.text}
                                                </span>
                                            )}
                                            {(r.request_count ?? 1) > 1 && (
                                                <span
                                                    title={`${r.request_count} kişi istedi`}
                                                    className="rounded-full bg-[#9B80FF]/20 px-2 py-0.5 text-[10px] font-extrabold text-[#CFC4FF]"
                                                >
                                                    ×{r.request_count}
                                                </span>
                                            )}
                                            <span className="text-[11px] text-[#7C7794]">
                                                {ago(r.last_requested_at ?? r.created_at, now)}
                                            </span>
                                        </div>
                                    </div>

                                    {voteable && (
                                        <VoteButtons
                                            id={r.spotify_id}
                                            name={r.name}
                                            likes={votes[r.spotify_id]?.likes ?? 0}
                                            mine={votes[r.spotify_id]?.mine ?? 0}
                                            played={wasPlayed}
                                            votingOpen={system.votingOpen}
                                            onVote={vote}
                                        />
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => openLyrics({ name: r.name, artists: r.artists })}
                                        title="Sözler"
                                        aria-label={`${r.name} şarkısının sözlerini aç`}
                                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#B3B3B3] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9B80FF]"
                                    >
                                        <Mic size={17} />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </section>
    );
}