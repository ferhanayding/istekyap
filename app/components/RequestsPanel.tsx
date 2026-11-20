"use client";

import { useEffect, useMemo, useState } from "react";
import { type RequestFeed, type RequestStatus } from "@/lib/use-request-feed";
import { useSystem } from "@/lib/system-context";
import { useSharedVotes } from "@/lib/votes-context";
import { useMine } from "@/lib/my-requests";
import { CLEAR_SEARCH_EVENT } from "@/lib/scroll";
import { timeAgo, useT } from "@/lib/i18n";
import type { MsgKey } from "@/lib/i18n-dict";
import { LyricsButton } from "./LyricsSheet";
import EqBars from "./EqBars";
import LoadingTracks from "./LoadingTracks";
import RequestHistory from "./RequestHistory";
import AskButton from "./AskButton";
import LastNight from "./LastNight";
import { useToast } from "./Toast";
import SongRow from "./SongRow";
import VoteButtons from "./VoteButtons";

type View = "night" | "history";

const BADGE: Record<RequestStatus, { text: MsgKey; className: string }> = {
    pending: { text: "Bekliyor", className: "bg-raised text-muted" },
    approved: {
        text: "Çalınacak",
        className: "bg-accent/15 text-accent",
    },
    played: { text: "Çalındı", className: "bg-raised text-ink" },
    // Küçük ve sakin: kişi kırılmasın, sebebi anlasın
    rejected: { text: "Repertuvarımızda yok", className: "bg-raised text-muted text-[11px]" },
};

export default function RequestsPanel({ feed }: { feed: RequestFeed }) {
    const { items, failed, live } = feed;
    const [view, setView] = useState<View>("night");
    // Eski istekler ilk açılışta yüklenir, sonra açık kalır (arama ve kaydırma kaybolmasın)
    const [historyOpened, setHistoryOpened] = useState(false);
    const toast = useToast();
    const t = useT();
    const pendingCount = items?.filter((r) => r.status === "pending").length;

    const tonight = useMemo(
        () => new Map((items ?? []).map((r) => [r.spotify_id, r.status] as const)),
        [items]
    );

    useEffect(() => {
        if (failed) toast.error(t("Liste güncellenemedi, tekrar denenecek."));
    }, [failed, toast, t]);

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
                aria-label={t("İstek Listesi")}
                className="mb-1.5 flex shrink-0 rounded-full bg-raised p-1"
            >
                {(
                    [
                        ["night", t("Bu gece")],
                        ["history", t("Eski istekler")],
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
                            <span className="size-1.5 rounded-full bg-accent" aria-label={t("canlı")} />
                        )}
                        {label}
                        {key === "night" && !!pendingCount && (
                            <span className="opacity-70">
                                · {t("{n} bekleyen", { n: pendingCount })}
                            </span>
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
    const mine = useMine();
    const t = useT();
    // Katılınabilecek istek var mı (ipucu satırı için)
    const canJoin =
        system.requestsOpen &&
        !!items?.some(
            (r) => (r.status === "pending" || r.status === "approved") && !mine.ids.has(r.spotify_id)
        );

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
                        <p>
                            {t(
                                'Henüz istek yok. Yukarıdaki "İstek Parça Yap" butonuna dokun, şarkını ara ve ilk isteği sen yap.'
                            )}
                        </p>
                    ) : (
                        <>
                            <p>
                                {t(
                                    "Canlı müzik başlayınca bu gecenin istekleri burada görünecek. O zamana kadar daha önce istenen şarkılara göz atabilirsin."
                                )}
                            </p>
                            <button
                                type="button"
                                onClick={onHistory}
                                className="mt-3 h-9 rounded-full bg-raised px-4 text-xs font-extrabold text-ink transition hover:bg-line"
                            >
                                {t("Eski isteklere bak")}
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <>
                {canJoin && (
                    <p className="pb-1 text-xs text-faint">
                        {t('Listedeki bir şarkıyı sen de istiyorsan "Ben de"ye dokun.')}
                    </p>
                )}
                <ul>
                    {items.map((r, idx) => {
                        const badge = BADGE[r.status] ?? BADGE.pending;
                        const playing = system.nowPlaying === r.spotify_id;

                        // Oy sadece çalınmış şarkılara (butonlar ve toplam her kartta görünür)
                        const wasPlayed =
                            r.status === "played" || system.played.has(r.spotify_id);
                        const isMine = mine.ids.has(r.spotify_id);
                        // Bekleyen ya da çalınacak isteğe katılınabilir (kendi isteğime değil)
                        const joinable =
                            !isMine &&
                            !wasPlayed &&
                            (r.status === "pending" || r.status === "approved");

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
                                // Durum, kaç kişi istediği ve zaman alt satırda: üstte "Ben de" ile
                                // dört buton yan yana rahat sığsın
                                meta={
                                    <>
                                        {playing ? (
                                            <span className="inline-flex items-center gap-1.5 font-bold text-accent">
                                                <EqBars />
                                                {t("Çalıyor")}
                                            </span>
                                        ) : (
                                            <span
                                                className={`rounded-full px-2 py-px font-bold ${badge.className}`}
                                            >
                                                {t(badge.text)}
                                            </span>
                                        )}
                                        {(r.request_count ?? 1) > 1 && (
                                            <span
                                                title={t("{n} kişi istedi", { n: r.request_count ?? 1 })}
                                                className="rounded-full bg-raised px-2 py-px font-extrabold text-ink"
                                            >
                                                ×{r.request_count}
                                            </span>
                                        )}
                                        {isMine ? (
                                            <span className="truncate font-bold text-accent">
                                                {t("Senin isteğin")}
                                            </span>
                                        ) : (
                                            <span className="truncate">
                                                {timeAgo(t, r.last_requested_at ?? r.created_at, now)}
                                            </span>
                                        )}
                                    </>
                                }
                                actions={
                                    <>
                                        <VoteButtons
                                            id={r.spotify_id}
                                            name={r.name}
                                            likes={votes[r.spotify_id]?.likes ?? 0}
                                            dislikes={votes[r.spotify_id]?.dislikes ?? 0}
                                            mine={votes[r.spotify_id]?.mine ?? 0}
                                            played={wasPlayed}
                                            votingOpen={system.votingOpen}
                                            onVote={vote}
                                        />
                                        {joinable && (
                                            <AskButton id={r.spotify_id} name={r.name} join />
                                        )}
                                        <LyricsButton name={r.name} artists={r.artists} />
                                    </>
                                }
                            />
                        );
                    })}
                </ul>
                </>
            )}
            {/* Gece kapalıyken liste boş kalmasın: son gecede çalınanlar */}
            {items !== null && !system.nightOpen && <LastNight />}
        </div>
    );
}
