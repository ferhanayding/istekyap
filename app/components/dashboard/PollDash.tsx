"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Trophy, Vote, X } from "lucide-react";
import { useLive } from "@/lib/live-client";
import {
    POLL_MAX_OPTIONS,
    POLL_MIN_OPTIONS,
    pollWinner,
    type Poll,
} from "@/lib/poll-types";
import { useToast } from "../Toast";

export type PollPick = { id: string; name: string };

// Biten anketin sonucu dashboard'da bu kadar süre durur (Kapat'a basılmazsa)
const RESULT_MS = 30 * 60_000;
const POLL_MS = 15_000;

// "Sıradaki şarkıyı siz seçin": listelerdeki oy kutusu simgesiyle 2-4 şarkı seçilir,
// buradan başlatılır; salon telefonundan oylar, sonuç canlı görünür.
export default function PollDash({
    pick,
    onRemove,
    onClear,
    nightClosed,
    busy,
    onPlay,
}: {
    pick: PollPick[];
    onRemove: (id: string) => void;
    onClear: () => void;
    nightClosed: boolean;
    /** Çal/Durdur işlemi sürüyor */
    busy: boolean;
    onPlay: (id: string, title: string) => void;
}) {
    const [poll, setPoll] = useState<Poll | null>(null);
    const [now, setNow] = useState(0);
    const [working, setWorking] = useState(false);
    const [dismissed, setDismissed] = useState<string | null>(null);
    const router = useRouter();
    const toast = useToast();

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/dashboard/poll", { cache: "no-store" });
            if (res.status === 401) {
                router.replace("/login");
                return;
            }
            const data = (await res.json()) as { poll?: Poll | null } | null;
            if (!res.ok || !data) return;
            setPoll(data.poll ?? null);
            setNow(Date.now());
        } catch {
            // Sessiz geç, bir sonraki turda tekrar dener
        }
    }, [router]);

    // Oy geldikçe sayılar anında güncellenir
    useLive("poll", () => void load(), { whenHidden: true });

    useEffect(() => {
        const first = setTimeout(() => void load(), 0);
        const timer = setInterval(() => {
            if (!document.hidden) void load();
        }, POLL_MS);
        return () => {
            clearTimeout(first);
            clearInterval(timer);
        };
    }, [load]);

    async function act(body: { action: "start"; ids: string[] } | { action: "close" }) {
        setWorking(true);
        try {
            const res = await fetch("/api/dashboard/poll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (res.status === 401) {
                router.replace("/login");
                return false;
            }
            const data = (await res.json().catch(() => null)) as {
                poll?: Poll | null;
                error?: string;
            } | null;
            if (!res.ok) {
                toast.error(data?.error ?? "İşlem yapılamadı.");
                return false;
            }
            setPoll(data?.poll ?? null);
            setNow(Date.now());
            return true;
        } catch {
            toast.error("İşlem yapılamadı.");
            return false;
        } finally {
            setWorking(false);
        }
    }

    async function start() {
        if (nightClosed) {
            toast.error("Gece kapalı. Önce Sistem sekmesinden geceyi başlat.");
            return;
        }
        if (await act({ action: "start", ids: pick.map((p) => p.id) })) {
            setDismissed(null);
            onClear();
            toast.success("Anket başladı. Salon şimdi oyluyor.");
        }
    }

    const open = !!poll && !poll.closedAt;
    const showResult =
        !!poll?.closedAt &&
        dismissed !== poll.id &&
        now - new Date(poll.closedAt).getTime() < RESULT_MS;
    const winner = poll && poll.closedAt ? pollWinner(poll) : null;

    if (pick.length === 0 && !open && !showResult) return null;

    return (
        <div className="mb-2 shrink-0 space-y-2">
            {/* Seçim: anket henüz başlamadı */}
            {pick.length > 0 && (
                <div className="rounded-lg bg-raised p-3">
                    <p className="flex items-center gap-2 text-sm font-bold text-ink">
                        <Vote size={16} className="shrink-0 text-accent" />
                        Anket hazırlığı · {pick.length}/{POLL_MAX_OPTIONS} şarkı
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {pick.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => onRemove(p.id)}
                                aria-label={`${p.name} anketten çıkar`}
                                className="flex h-7 max-w-full items-center gap-1 rounded-full bg-line pl-3 pr-2 text-xs font-bold text-ink"
                            >
                                <span className="truncate">{p.name}</span>
                                <X size={13} className="shrink-0 text-muted" />
                            </button>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-faint">
                        {pick.length < POLL_MIN_OPTIONS
                            ? `En az ${POLL_MIN_OPTIONS} şarkı seç (listelerdeki oy kutusu simgesi).`
                            : open
                              ? "Başlatınca açık olan anket biter, yenisi başlar."
                              : "Başlatınca salon telefonundan oylar, sonuç burada canlı görünür."}
                    </p>
                    <div className="mt-2 flex gap-2">
                        <button
                            type="button"
                            disabled={working || pick.length < POLL_MIN_OPTIONS}
                            onClick={start}
                            className="h-9 flex-1 rounded-full bg-accent text-xs font-extrabold text-on-accent transition active:scale-95 disabled:opacity-40"
                        >
                            Anketi başlat
                        </button>
                        <button
                            type="button"
                            disabled={working}
                            onClick={onClear}
                            className="h-9 rounded-full bg-line px-4 text-xs font-extrabold text-ink transition active:scale-95 disabled:opacity-50"
                        >
                            Vazgeç
                        </button>
                    </div>
                </div>
            )}

            {/* Açık anket ya da az önce bitenin sonucu */}
            {poll && (open || showResult) && (
                <div className="rounded-lg bg-accent/[0.08] p-3 ring-1 ring-accent/25">
                    <p className="flex items-center gap-2 text-sm font-bold text-ink">
                        {open ? (
                            <Vote size={16} className="shrink-0 text-accent" />
                        ) : (
                            <Trophy size={16} className="shrink-0 text-accent" />
                        )}
                        <span className="min-w-0 flex-1 truncate">
                            {open
                                ? "Anket açık"
                                : winner
                                  ? `Anket bitti · Kazanan: ${winner.name}`
                                  : "Anket bitti · Oy çıkmadı"}
                        </span>
                        <span className="shrink-0 text-xs text-muted">{poll.total} oy</span>
                    </p>
                    <ul className="mt-2 space-y-1">
                        {poll.options.map((o) => {
                            const pct = poll.total ? Math.round((o.votes / poll.total) * 100) : 0;
                            return (
                                <li
                                    key={o.id}
                                    className="relative flex items-center gap-2 overflow-hidden rounded-md bg-raised px-2.5 py-1.5"
                                >
                                    <span
                                        aria-hidden
                                        className="absolute inset-y-0 left-0 bg-accent/20"
                                        style={{ width: `${pct}%` }}
                                    />
                                    <span className="relative min-w-0 flex-1 truncate text-sm font-bold text-ink">
                                        {o.name}
                                        <span className="font-normal text-muted"> · {o.artists}</span>
                                    </span>
                                    <span className="relative shrink-0 text-xs font-extrabold tabular-nums text-ink">
                                        {o.votes} oy · %{pct}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="mt-2 flex gap-2">
                        {open ? (
                            <button
                                type="button"
                                disabled={working}
                                onClick={() => void act({ action: "close" })}
                                className="h-9 flex-1 rounded-full bg-danger/15 text-xs font-extrabold text-danger transition active:scale-95 disabled:opacity-50"
                            >
                                Anketi bitir
                            </button>
                        ) : (
                            <>
                                {winner && (
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() =>
                                            onPlay(winner.id, `${winner.name} · ${winner.artists}`)
                                        }
                                        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-accent text-xs font-extrabold text-on-accent transition active:scale-95 disabled:opacity-50"
                                    >
                                        <Play size={13} fill="currentColor" />
                                        Kazananı çal
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setDismissed(poll.id)}
                                    className="h-9 rounded-full bg-line px-4 text-xs font-extrabold text-ink transition active:scale-95"
                                >
                                    Kapat
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Listelerdeki "ankete ekle" düğmesi (playlist satırı, bekleyen/onaylı istek)
export function PollPickButton({
    name,
    picked,
    onToggle,
}: {
    name: string;
    picked: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-pressed={picked}
            aria-label={picked ? `${name} anketten çıkar` : `${name} ankete ekle`}
            title={picked ? "Anketten çıkar" : "Ankete ekle"}
            className={`flex size-9 shrink-0 items-center justify-center rounded-full transition active:scale-95 ${
                picked ? "bg-accent text-on-accent" : "bg-raised text-muted hover:bg-line"
            }`}
        >
            <Vote size={16} />
        </button>
    );
}
