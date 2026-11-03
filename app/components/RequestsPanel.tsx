"use client";

import { ListMusic, Music2 } from "lucide-react";
import {
    POLL_MS,
    type RequestFeed,
    type RequestStatus,
} from "@/lib/use-request-feed";
import { useSystem } from "@/lib/system-context";
import LoadingTracks from "./LoadingTracks";
import NowPlayingBadge from "./NowPlayingBadge";
import { lyricsUrl } from "@/lib/lyrics";
const COLORS = ["#9B87FF", "#37D9BD", "#FF729B", "#FFBD59"];
const rtf = new Intl.RelativeTimeFormat("tr", { numeric: "auto" });

const BADGE: Record<RequestStatus, { text: string; className: string }> = {
    pending: { text: "Bekliyor", className: "bg-white/[0.07] text-[#A99EC9]" },
    approved: {
        text: "Onaylandı · Çalınacak",
        className: "bg-[#37D9BD]/15 text-[#37D9BD]",
    },
    played: { text: "Çalındı", className: "bg-[#9B80FF]/15 text-[#B9A6FF]" },
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
    const { items, failed, now } = feed;
    const { nowPlaying } = useSystem();
    const pendingCount = items?.filter((r) => r.status === "pending").length;

    return (
        <section className="relative mt-5 flex min-h-0 flex-1 flex-col px-5">
            <div className="mb-3 shrink-0">
                <div className="mb-1.5 flex items-center gap-2">
                    <ListMusic size={16} className="text-[#A58AFF]" />
                    <span className="text-[10px] font-bold uppercase tracking-[2px] text-[#8F86AB]">
                        İSTENEN PARÇALAR
                    </span>
                </div>

                <h2 className="text-2xl font-extrabold tracking-tight">İstek Listesi</h2>

                <p className="mt-1 text-xs text-[#817A98]">
                    {items ? `${pendingCount} bekleyen istek` : "…"} · {POLL_MS / 1000}{" "}
                    saniyede bir güncellenir
                </p>
            </div>

            {failed && (
                <p className="mb-3 shrink-0 rounded-xl bg-[#FF729B]/10 px-3 py-2 text-xs text-[#FF729B]">
                    Liste güncellenemedi, tekrar denenecek.
                </p>
            )}

            <div className="-mx-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 [scrollbar-color:#3A3270_transparent] [scrollbar-width:thin]">
                {items === null ? (
                    <LoadingTracks />
                ) : items.length === 0 ? (
                    <p className="rounded-2xl bg-[#19162D] p-4 text-sm text-[#89839F]">
                        Henüz istek yok. Yukarıdaki butondan ilk isteği sen yap.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {items.map((r, i) => {
                            const color = COLORS[i % COLORS.length];
                            const badge = BADGE[r.status] ?? BADGE.pending;
                            const rejected = r.status === "rejected";
                            const playing = nowPlaying === r.spotify_id;
                            return (
                                <li
                                    key={r.id}
                                    className={`flex items-center gap-3 rounded-2xl border p-3 ${playing
                                        ? "border-[#37D9BD]/50 bg-gradient-to-r from-[#17342F] to-[#19162D] shadow-[0_0_24px_-8px_#37D9BD]"
                                        : r.status === "approved"
                                            ? "border-[#37D9BD]/30 bg-[#19162D]"
                                            : "border-white/[0.04] bg-[#19162D]"
                                        } ${rejected ? "opacity-70" : ""}`}
                                >
                                    <div className="relative shrink-0">
                                        {r.cover ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={r.cover}
                                                alt=""
                                                width={52}
                                                height={52}
                                                className={`size-[52px] rounded-xl object-cover ${rejected ? "grayscale" : ""
                                                    }`}
                                            />
                                        ) : (
                                            <div
                                                className="size-[52px] rounded-xl"
                                                style={{ backgroundColor: color }}
                                            />
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[15px] font-bold text-[#F5F2FF]">
                                            {r.name}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-[#89839F]">
                                            {r.artists}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                            {playing ? (
                                                <NowPlayingBadge />
                                            ) : (
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.className}`}
                                                >
                                                    {badge.text}
                                                </span>
                                            )}
                                            <span className="text-[11px] text-[#817A98]">
                                                {ago(r.created_at, now)}
                                            </span>
                                        </div>
                                    </div>

                                    <a
                                        href={lyricsUrl(r.name, r.artists)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={`${r.name} şarkısının sözlerini Google'da ara`}
                                        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#8C70FF]/15 px-3 text-xs font-bold text-[#AA96FF] transition hover:bg-[#8C70FF]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9B80FF]"
                                    >
                                        <Music2 size={15} />
                                        Sözler
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </section>
    );
}