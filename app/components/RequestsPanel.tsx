"use client";

import { ListMusic } from "lucide-react";
import { POLL_MS, type RequestFeed } from "@/lib/use-request-feed";
import LoadingTracks from "./LoadingTracks";

const COLORS = ["#9B87FF", "#37D9BD", "#FF729B", "#FFBD59"];
const rtf = new Intl.RelativeTimeFormat("tr", { numeric: "auto" });

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
                    {items ? `${items.length} bekleyen istek` : "…"} · {POLL_MS / 1000}{" "}
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
                            return (
                                <li
                                    key={r.id}
                                    className="flex items-center gap-3 rounded-2xl border border-white/[0.04] bg-[#19162D] p-3"
                                >
                                    <div className="relative shrink-0">
                                        {r.cover ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={r.cover}
                                                alt=""
                                                width={52}
                                                height={52}
                                                className="size-[52px] rounded-xl object-cover"
                                            />
                                        ) : (
                                            <div
                                                className="size-[52px] rounded-xl"
                                                style={{ backgroundColor: color }}
                                            />
                                        )}
                                        <span
                                            className="absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-[#19162D]"
                                            style={{ backgroundColor: color }}
                                        />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[15px] font-bold text-[#F5F2FF]">
                                            {r.name}
                                        </p>
                                        <p className="mt-1 truncate text-xs text-[#89839F]">
                                            {r.artists}
                                        </p>
                                    </div>

                                    <span className="shrink-0 text-[11px] text-[#817A98]">
                                        {ago(r.created_at, now)}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </section>
    );
}