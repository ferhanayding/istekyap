"use client";

import { RotateCcw, Square, Trash2 } from "lucide-react";
import type { DashboardSystem } from "@/lib/use-dashboard-system";
import NowPlayingBadge from "../NowPlayingBadge";

function Toggle({
    label,
    desc,
    on,
    disabled,
    onChange,
}: {
    label: string;
    desc: string;
    on: boolean;
    disabled: boolean;
    onChange: (next: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.04] bg-[#19162D] p-4">
            <div className="min-w-0">
                <p className="text-[15px] font-bold text-[#F5F2FF]">
                    {label}{" "}
                    <span
                        className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${on
                            ? "bg-[#37D9BD]/15 text-[#37D9BD]"
                            : "bg-white/[0.07] text-[#A99EC9]"
                            }`}
                    >
                        {on ? "Açık" : "Kapalı"}
                    </span>
                </p>
                <p className="mt-1 text-xs text-[#89839F]">{desc}</p>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={label}
                disabled={disabled}
                onClick={() => onChange(!on)}
                className={`relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-50 ${on ? "bg-[#37D9BD]" : "bg-white/[0.12]"
                    }`}
            >
                <span
                    className={`absolute left-1 top-1 size-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : ""
                        }`}
                />
            </button>
        </div>
    );
}

export default function SystemPanel({
    system,
    onChanged,
}: {
    system: DashboardSystem;
    onChanged: () => void;
}) {
    const { state, busy, act } = system;

    async function run(body: Parameters<typeof act>[0], confirmText?: string) {
        if (confirmText && !window.confirm(confirmText)) return;
        if (await act(body)) onChanged();
    }

    if (!state) {
        return <p className="text-sm text-[#89839F]">Yükleniyor…</p>;
    }

    return (
        <div className="-mx-5 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 pb-10 [scrollbar-color:#3A3270_transparent] [scrollbar-width:thin]">
            <Toggle
                label="İstek alma"
                desc="Açıkken ziyaretçiler şarkı isteyebilir. Kapalıyken buton pasif olur."
                on={state.requestsOpen}
                disabled={busy}
                onChange={(value) => run({ action: "set", key: "requests_open", value })}
            />
            <Toggle
                label="Oylama"
                desc="Açıkken ziyaretçiler çalınmış şarkılara 👍 / 👎 verebilir."
                on={state.votingOpen}
                disabled={busy}
                onChange={(value) => run({ action: "set", key: "voting_open", value })}
            />

            <div className="rounded-2xl border border-white/[0.04] bg-[#19162D] p-4">
                <p className="text-[15px] font-bold text-[#F5F2FF]">Şu an çalan</p>
                {state.nowPlaying ? (
                    <div className="mt-2 flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                            <NowPlayingBadge />
                            <p className="mt-0.5 truncate text-sm font-bold">
                                {state.nowPlayingTitle ?? "Şarkı"}
                            </p>
                        </div>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => run({ action: "stop" })}
                            className="flex h-10 items-center gap-1.5 rounded-xl bg-[#FF729B]/15 px-3 text-sm font-bold text-[#FF729B] transition active:scale-95 disabled:opacity-50"
                        >
                            <Square size={14} fill="currentColor" />
                            Durdur
                        </button>
                    </div>
                ) : (
                    <p className="mt-1 text-xs text-[#89839F]">
                        Şu an çalan yok. Playlist ya da onaylı isteklerden Çal&apos;a bas.
                    </p>
                )}
                <p className="mt-3 text-xs text-[#817A98]">
                    Bu gece çalınan: {state.played.length} şarkı
                </p>
            </div>

            <div className="rounded-2xl border border-white/[0.04] bg-[#19162D] p-4">
                <p className="text-[15px] font-bold text-[#F5F2FF]">Yeni gece</p>
                <p className="mt-1 text-xs text-[#89839F]">
                    Konser bitince ya da yeni bir gün başlamadan önce kullan.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                            run(
                                { action: "reset_played" },
                                "Çalındı işaretleri silinsin mi? Tüm şarkılar tekrar \"çalınmadı\" olur."
                            )
                        }
                        className="flex h-10 items-center justify-center gap-2 rounded-xl bg-white/[0.06] px-3 text-sm font-bold text-[#C9C2E4] transition active:scale-95 disabled:opacity-50"
                    >
                        <RotateCcw size={16} />
                        Çalınanları sıfırla
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                            run(
                                { action: "reset_requests" },
                                "Tüm istekler (bekleyen, onaylı, çalınan, reddedilen) kalıcı olarak silinsin mi? Geri alınamaz."
                            )
                        }
                        className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#FF729B]/15 px-3 text-sm font-bold text-[#FF729B] transition active:scale-95 disabled:opacity-50"
                    >
                        <Trash2 size={16} />
                        İstekleri sıfırla
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                            run(
                                { action: "reset_votes" },
                                "Tüm beğeni ve beğenmeme oyları silinsin mi? Geri alınamaz."
                            )
                        }
                        className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#FF729B]/15 px-3 text-sm font-bold text-[#FF729B] transition active:scale-95 disabled:opacity-50"
                    >
                        <Trash2 size={16} />
                        Oyları sıfırla
                    </button>
                </div>
            </div>
        </div>
    );
}