"use client";

import { useEffect, useMemo, useState } from "react";
import { type RequestFeed, type RequestStatus } from "@/lib/use-request-feed";
import { useSystem } from "@/lib/system-context";
import { useSharedVotes } from "@/lib/votes-context";
import { CLEAR_SEARCH_EVENT } from "@/lib/scroll";
import { LyricsButton } from "./LyricsSheet";
import EqBars from "./EqBars";
import LoadingTracks from "./LoadingTracks";
import RequestHistory from "./RequestHistory";
import { useToast } from "./Toast";
import SongRow from "./SongRow";
import VoteButtons from "./VoteButtons";

type View = "night" | "history";

const rtf = new Intl.RelativeTimeFormat("tr", { numeric: "auto" });

const BADGE: Record<RequestStatus, { text: string; className: string }> = {
    pending: { text: "Bekliyor", className: "bg-raised text-muted" },
    approved: {
        text: "Çalınacak",
        className: "bg-accent/15 text-accent",
    },
    played: { text: "Çalındı", className: "bg-raised text-ink" },
    rejected: { text: "Reddedildi", className: "bg-danger/15 text-danger" },
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
    const { items, failed, live } = feed;
    const [view, setView] = useState<View>("night");
    // Eski istekler ilk açılışta yüklenir, sonra açık kalır (arama ve kaydırma kaybolmasın)
    const [historyOpened, setHistoryOpened] = useState(false);
    const toast = useToast();
    const pendingCount = items?.filter((r) => r.status === "pending").length;

    const tonight = useMemo(
        () => new Map((items ?? []).map((r) => [r.spotify_id, r.status] as const)),
        [items]
    );

    useEffect(() => {
        if (failed) toast.error("Liste güncellenemedi, tekrar denenecek.");
    }, [failed, toast]);

    // Mini oynatıcıya basınca çalan şarkı "Bu gece" listesinde görünsün
    useEffect(() => {
        const toNight = () => setView("night");
        window.addEventListener(CLEAR_SEARCH_EVENT, toNight);
        return () => window.removeEventListener(CLEAR_SEARCH_EVENT, toNight);
    }, []);

    function show(v: View) {
        setView(v);
        if (v === "history") setHistoryOpened(true);
    }

    return (
        <section className="relative mt-2 flex min-h-0 flex-1 flex-col px-5">
            {/* Başlık yerine sekmeler: alan listeye kalsın */}
            <div
                role="tablist"
                aria-label="İstek listesi"
                className="mb-1.5 flex shrink-0 rounded-full bg-raised p-1"
            >
                {(
                    [
                        ["night", "Bu gece"],
                        ["history", "Eski istekler"],
                    ] as const
                ).map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={view === key}
                        onClick={() => show(key)}
                        className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-extrabold transition ${view === key ? "bg-ink text-page" : "text-muted hover:text-ink"
                            }`}
                    >
                        {key === "night" && live && (
                            <span className="size-1.5 rounded-full bg-accent" aria-label="canlı" />
                        )}
                        {label}
                        {key === "night" && !!pendingCount && (
                            <span className="opacity-70">· {pendingCount} bekleyen</span>
                        )}
                    </button>
                ))}
            </div>

            <div className={view === "night" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
                <TonightList feed={feed} onHistory={() => show("history")} />
            </div>
            {historyOpened && (
                <div className={view === "history" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
                    <RequestHistory tonight={tonight} active={view === "history"} />
                </div>
            )}
        </section>
    );
}

function TonightList({ feed, onHistory }: { feed: RequestFeed; onHistory: () => void }) {
    const { items, now } = feed;
    const system = useSystem();
    const { votes, vote } = useSharedVotes();

    return (
        <div
            data-scroll-list
            className="-mx-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 [scrollbar-color:var(--color-line)_transparent] [scrollbar-width:thin]"
        >
            {items === null ? (
                <LoadingTracks />
            ) : items.length === 0 ? (
                <div className="mt-2 rounded-lg bg-surface p-4 text-sm text-muted">
                    {system.requestsOpen ? (
                        <p>Henüz istek yok. Yukarıdaki butondan ilk isteği sen yap.</p>
                    ) : (
                        <>
                            <p>
                                Canlı müzik başlayınca bu gecenin istekleri burada görünecek.
                                O zamana kadar daha önce istenen şarkılara göz atabilirsin.
                            </p>
                            <button
                                type="button"
                                onClick={onHistory}
                                className="mt-3 h-9 rounded-full bg-raised px-4 text-xs font-extrabold text-ink transition hover:bg-line"
                            >
                                Eski isteklere bak
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <ul>
                    {items.map((r, idx) => {
                        const badge = BADGE[r.status] ?? BADGE.pending;
                        const playing = system.nowPlaying === r.spotify_id;

                        // Onaylı ve çalınmış istekler oylanabilir
                        const voteable = r.status === "approved" || r.status === "played";
                        const wasPlayed =
                            r.status === "played" || system.played.has(r.spotify_id);

                        return (
                            <SongRow
                                key={r.id}
                                as="li"
                                id={`req-${r.spotify_id}`}
                                cover={r.cover}
                                name={r.name}
                                artists={r.artists}
                                playing={playing}
                                dim={r.status === "rejected"}
                                eager={idx < 8}
                                meta={
                                    <>
                                        {playing ? (
                                            <span className="inline-flex items-center gap-1.5 font-bold text-accent">
                                                <EqBars />
                                                Çalıyor
                                            </span>
                                        ) : (
                                            <span
                                                className={`rounded-full px-2 py-px font-bold ${badge.className}`}
                                            >
                                                {badge.text}
                                            </span>
                                        )}
                                        {(r.request_count ?? 1) > 1 && (
                                            <span
                                                title={`${r.request_count} kişi istedi`}
                                                className="rounded-full bg-raised px-2 py-px font-extrabold text-ink"
                                            >
                                                ×{r.request_count}
                                            </span>
                                        )}
                                        <span className="truncate">
                                            {ago(r.last_requested_at ?? r.created_at, now)}
                                        </span>
                                    </>
                                }
                                actions={
                                    <>
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
                                        <LyricsButton name={r.name} artists={r.artists} />
                                    </>
                                }
                            />
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
