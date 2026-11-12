"use client";

import { useEffect, useState } from "react";
import { BarChart3, ChevronDown, Moon, Play, Square, Trash2, Undo2 } from "lucide-react";
import type { DashboardSystem, SystemAction } from "@/lib/use-dashboard-system";
import {
    DEFAULT_REQUEST_LIMIT,
    DEFAULT_REQUEST_WINDOW_MIN,
    MAX_REQUEST_LIMIT,
    MAX_REQUEST_WINDOW_MIN,
    validLimitValue,
} from "@/lib/request-limit";
import EqBars from "../EqBars";

// "Geceyi bitir"den sonra geri alma süresi (sunucudaki UNDO_END_MS ile aynı)
const UNDO_MS = 10 * 60_000;

const timeFmt = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });
const dateTimeFmt = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
});

// Bugünse sadece saat, değilse gün + saat
function when(iso: string, now: number): string {
    const d = new Date(iso);
    const sameDay = now - d.getTime() < 18 * 3600_000;
    return sameDay ? timeFmt.format(d) : dateTimeFmt.format(d);
}

function Switch({
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
        <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
                <p className="text-sm font-bold text-ink">{label}</p>
                <p className="mt-0.5 text-xs text-faint">{desc}</p>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={label}
                disabled={disabled}
                onClick={() => onChange(!on)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${on ? "bg-accent" : "bg-line"
                    }`}
            >
                <span
                    className={`absolute left-1 top-1 size-5 rounded-full bg-ink shadow transition-transform ${on ? "translate-x-5" : ""
                        }`}
                />
            </button>
        </div>
    );
}

const numInput =
    "h-11 w-full rounded-lg bg-raised px-3 text-base font-bold text-ink outline-none ring-1 ring-line focus:ring-accent disabled:opacity-50";

// İstek sınırı: "kaç dakikada kaç istek". Sadece gece, istek alma ve oylama kapalıyken değişir.
// Kayıtlı değer değişince (başka telefondan da) key ile yeniden kurulur.
function LimitCard({
    limit,
    minutes,
    locked,
    busy,
    onSave,
}: {
    limit: number;
    minutes: number;
    locked: boolean;
    busy: boolean;
    onSave: (limit: number, minutes: number) => void;
}) {
    const [l, setL] = useState(String(limit));
    const [m, setM] = useState(String(minutes));
    const nl = Number(l);
    const nm = Number(m);
    const valid =
        l.trim() !== "" &&
        m.trim() !== "" &&
        validLimitValue(nl, MAX_REQUEST_LIMIT) &&
        validLimitValue(nm, MAX_REQUEST_WINDOW_MIN);
    const changed = nl !== limit || nm !== minutes;

    return (
        <form
            className="rounded-lg bg-surface p-4"
            onSubmit={(e) => {
                e.preventDefault();
                if (valid && changed && !locked) onSave(nl, nm);
            }}
        >
            <p className="text-base font-bold text-ink">İstek sınırı</p>
            <p className="mt-1 text-xs text-muted">
                Şu an: her cihaz {minutes} dakikada en fazla {limit} istek atabilir.
            </p>
            <div className="mt-3 flex items-end gap-2">
                <label className="min-w-0 flex-1">
                    <span className="mb-1 block text-xs font-bold text-faint">Dakika</span>
                    <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={MAX_REQUEST_WINDOW_MIN}
                        step={1}
                        value={m}
                        disabled={locked || busy}
                        onChange={(e) => setM(e.target.value)}
                        className={numInput}
                    />
                </label>
                <label className="min-w-0 flex-1">
                    <span className="mb-1 block text-xs font-bold text-faint">İstek sayısı</span>
                    <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={MAX_REQUEST_LIMIT}
                        step={1}
                        value={l}
                        disabled={locked || busy}
                        onChange={(e) => setL(e.target.value)}
                        className={numInput}
                    />
                </label>
                <button
                    type="submit"
                    disabled={locked || busy || !valid || !changed}
                    className="h-11 shrink-0 rounded-full bg-accent px-5 text-sm font-extrabold text-on-accent transition active:scale-95 disabled:opacity-40"
                >
                    Kaydet
                </button>
            </div>
            <p className="mt-2 text-xs text-faint">
                {locked
                    ? "Değiştirmek için gece, istek alma ve oylama kapalı olmalı."
                    : !valid
                        ? `Dakika 1-${MAX_REQUEST_WINDOW_MIN}, istek sayısı 1-${MAX_REQUEST_LIMIT} arasında tam sayı olmalı.`
                        : "Gece başlayınca bu kural kilitlenir."}
            </p>
        </form>
    );
}

const dangerBtn =
    "flex h-11 items-center justify-center gap-2 rounded-full bg-danger/15 px-4 text-sm font-extrabold text-danger transition active:scale-95 disabled:opacity-50";

export default function SystemPanel({
    system,
    onChanged,
}: {
    system: DashboardSystem;
    onChanged: () => void;
}) {
    const { state, busy, act } = system;

    // Saat yazıları ve "Geri al"ın süresi için: yarım dakikada bir güncellenir
    const [now, setNow] = useState(0);
    useEffect(() => {
        const tick = () => setNow(Date.now());
        const first = setTimeout(tick, 0);
        const timer = setInterval(tick, 30_000);
        return () => {
            clearTimeout(first);
            clearInterval(timer);
        };
    }, []);

    async function run(body: SystemAction, confirmText?: string) {
        if (confirmText && !window.confirm(confirmText)) return;
        if (!(await act(body))) return;
        setNow(Date.now());
        onChanged();
    }

    if (!state) {
        return <p className="text-sm text-muted">Yükleniyor…</p>;
    }

    const limit = state.requestLimit ?? DEFAULT_REQUEST_LIMIT;
    const minutes = state.requestWindowMin ?? DEFAULT_REQUEST_WINDOW_MIN;
    const endedAt = state.nightEndedAt ? new Date(state.nightEndedAt).getTime() : 0;
    const canUndo = !state.nightOpen && endedAt > 0 && now > 0 && now - endedAt < UNDO_MS;
    // Gece 14 saatten uzun açık kaldıysa bitirmeyi unutmuş olabilirsiniz
    const startedAt = state.nightStartedAt ? new Date(state.nightStartedAt).getTime() : 0;
    const stale = state.nightOpen && startedAt > 0 && now - startedAt > 14 * 3600_000;

    return (
        <div className="-mx-5 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 pb-4 [scrollbar-color:var(--color-line)_transparent] [scrollbar-width:thin]">
            {/* Gece: tek buton */}
            <div
                className={`rounded-lg p-4 ${state.nightOpen
                    ? "bg-accent/[0.08] ring-1 ring-accent/25"
                    : "bg-surface"
                    }`}
            >
                <p className="flex items-center gap-2 text-base font-bold text-ink">
                    {state.nightOpen ? (
                        <>
                            <span className="relative flex size-2.5">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
                                <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
                            </span>
                            Gece açık
                        </>
                    ) : (
                        <>
                            <Moon size={16} className="text-muted" />
                            Gece kapalı
                        </>
                    )}
                </p>
                <p className="mt-1 text-xs text-muted">
                    {state.nightOpen
                        ? state.nightStartedAt && now
                            ? `Başlangıç: ${when(state.nightStartedAt, now)}. Ziyaretçiler istek atabiliyor, oy verebiliyor.`
                            : "Ziyaretçiler istek atabiliyor, oy verebiliyor."
                        : "Başlatınca istek ve oylama açılır; önceki gecenin listesi ziyaretçilerden kalkar."}
                </p>
                {stale && (
                    <p className="mt-2 rounded-md bg-accent/10 px-3 py-2 text-xs font-bold text-accent">
                        Gece uzun süredir açık. Konser bittiyse bitirmeyi unutmuş olabilirsiniz.
                    </p>
                )}

                {state.nightOpen ? (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                            run(
                                { action: "end_night" },
                                "Gece bitirilsin mi? İstek ve oylama kapanır. Bu gecenin istekleri ziyaretçilerin ekranından kalkar, istatistikte kalır. 10 dakika içinde geri alabilirsin."
                            )
                        }
                        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-danger text-base font-extrabold text-on-accent transition active:scale-[0.98] disabled:opacity-50"
                    >
                        <Square size={16} fill="currentColor" />
                        Geceyi bitir
                    </button>
                ) : (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                            run(
                                { action: "start_night" },
                                "Yeni gece başlasın mı? İstek ve oylama açılır. Önceki gecenin istekleri, oyları ve çalındı işaretleri ziyaretçilerin ekranından kalkar (istatistikte kalır)."
                            )
                        }
                        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-base font-extrabold text-on-accent transition active:scale-[0.98] disabled:opacity-50"
                    >
                        <Play size={16} fill="currentColor" />
                        Geceyi başlat
                    </button>
                )}

                {canUndo && (
                    <div className="mt-2 flex items-center justify-between gap-3 rounded-full bg-raised py-1.5 pl-4 pr-1.5">
                        <span className="text-xs text-muted">Yanlışlıkla mı bastın?</span>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => run({ action: "undo_end" })}
                            className="flex h-8 items-center gap-1.5 rounded-full bg-line px-3 text-xs font-extrabold text-ink transition active:scale-95 disabled:opacity-50"
                        >
                            <Undo2 size={14} />
                            Geri al
                        </button>
                    </div>
                )}
            </div>

            {/* Anahtarlar: gece başlat/bitir bunları kendisi açıp kapatır, gece içinde elle de değişir */}
            <div className="rounded-lg bg-surface px-4 py-1">
                <div className="divide-y divide-line">
                    <Switch
                        label="İstek alma"
                        desc="Ara verirken kapatabilirsin."
                        on={state.requestsOpen}
                        disabled={busy}
                        onChange={(value) => run({ action: "set", key: "requests_open", value })}
                    />
                    <Switch
                        label="Oylama"
                        desc="Çalınan şarkılara 👍 / 👎."
                        on={state.votingOpen}
                        disabled={busy}
                        onChange={(value) => run({ action: "set", key: "voting_open", value })}
                    />
                    <Switch
                        label="Playlist"
                        desc="Repertuar sekmesi. Geceden etkilenmez."
                        on={state.playlistVisible}
                        disabled={busy}
                        onChange={(value) =>
                            run({ action: "set", key: "playlist_visible", value })
                        }
                    />
                </div>
            </div>

            <LimitCard
                key={`${limit}-${minutes}`}
                limit={limit}
                minutes={minutes}
                locked={state.nightOpen || state.requestsOpen || state.votingOpen}
                busy={busy}
                onSave={(l, m) => run({ action: "set_limit", limit: l, minutes: m })}
            />

            <div className="rounded-lg bg-surface p-4">
                <p className="text-base font-bold text-ink">Şu an çalan</p>
                {state.nowPlaying ? (
                    <div className="mt-2 flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-accent">
                                <EqBars />
                                Çalıyor
                            </span>
                            <p className="mt-0.5 truncate text-sm font-bold">
                                {state.nowPlayingTitle ?? "Şarkı"}
                            </p>
                        </div>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => run({ action: "stop" })}
                            className="flex h-10 items-center gap-1.5 rounded-full bg-danger/20 px-4 text-sm font-extrabold text-danger transition active:scale-95 disabled:opacity-50"
                        >
                            <Square size={14} fill="currentColor" />
                            Durdur
                        </button>
                    </div>
                ) : (
                    <p className="mt-1 text-xs text-muted">
                        Şu an çalan yok. Playlist ya da onaylı isteklerden Çal&apos;a bas.
                    </p>
                )}
                <p className="mt-3 text-xs text-faint">
                    Bu gece çalınan: {state.played.length} şarkı · Çalıyor işareti 5 dakika
                    sonra kendiliğinden kapanır.
                </p>
            </div>

            {/* Nadiren gereken, geri alınamayan işlemler */}
            <details className="group rounded-lg bg-surface">
                <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-bold text-muted [&::-webkit-details-marker]:hidden">
                    Gelişmiş
                    <ChevronDown
                        size={16}
                        className="transition-transform group-open:rotate-180"
                    />
                </summary>
                <div className="flex flex-col gap-2 px-4 pb-4">
                    <p className="text-xs text-faint">
                        Bunlar geri alınamaz. Normal gecelerde gerekmez, Geceyi başlat/bitir yeterli.
                    </p>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                            run(
                                { action: "reset_requests" },
                                "Tüm istekler (eski istekler dahil) kalıcı olarak silinsin mi? İstatistiklerden ve ziyaretçilerin Eski istekler listesinden de çıkar, geri alınamaz."
                            )
                        }
                        className={dangerBtn}
                    >
                        <Trash2 size={16} />
                        İstekleri kalıcı sil
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                            run(
                                { action: "reset_stats" },
                                "Tüm istatistikler sıfırlansın mı? Çalma geçmişi, eski oy toplamları ve arşivdeki istekler kalıcı olarak silinir. Bu geceki liste, oylar ve yorumlar kalır. Geri alınamaz."
                            )
                        }
                        className={dangerBtn}
                    >
                        <BarChart3 size={16} />
                        Tüm istatistikleri sıfırla
                    </button>
                </div>
            </details>
        </div>
    );
}
