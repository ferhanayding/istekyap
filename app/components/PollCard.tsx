"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Trophy, Vote, X } from "lucide-react";
import { useLive } from "@/lib/live-client";
import { POLL_RESULT_MS, pollWinner, type Poll } from "@/lib/poll-types";
import { useToast } from "./Toast";

// Hangi ankette neye oy verdim: tarayıcıda durur (oy sayıları herkese aynı gider)
const VOTE_KEY = "istekyap:anket";
type MyVote = { poll: string; option: string };

function readVote(): MyVote | null {
    if (typeof window === "undefined") return null;
    try {
        const v = JSON.parse(localStorage.getItem(VOTE_KEY) ?? "null") as MyVote | null;
        return v && typeof v.poll === "string" && typeof v.option === "string" ? v : null;
    } catch {
        return null;
    }
}

function writeVote(v: MyVote) {
    try {
        localStorage.setItem(VOTE_KEY, JSON.stringify(v));
    } catch {
        // Yazılamazsa sadece işaret hatırlanmaz, oy sunucuda sayılır
    }
}

const POLL_MS = 60_000;
const FALLBACK_POLL_MS = 8_000;

// "Sıradaki şarkıyı siz seçin": grup dashboard'dan 2-4 şarkı koyar, salon dokunarak oylar.
// Anket yokken hiç yer kaplamaz.
export default function PollCard() {
    const [poll, setPoll] = useState<Poll | null>(null);
    const [myVote, setMyVote] = useState<MyVote | null>(readVote);
    const [sending, setSending] = useState(false);
    const [hidden, setHidden] = useState<string | null>(null);
    const toast = useToast();

    // v: canlı sinyalin sürümü (herkes aynı adresi ister, CDN tek cevap verir)
    const load = useCallback(async (v?: number) => {
        try {
            const res = await fetch(v ? `/api/poll?v=${v}` : "/api/poll");
            const data = (await res.json()) as { poll?: Poll | null } | null;
            if (!res.ok || !data) return;
            setPoll(data.poll ?? null);
        } catch {
            // Sessiz geç, bir sonraki turda tekrar dener
        }
    }, []);

    const live = useLive("poll", (v) => void load(v));

    useEffect(() => {
        const first = setTimeout(() => void load(), 0);
        const onVisible = () => {
            if (!document.hidden) void load();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            clearTimeout(first);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [load]);

    // Yedek yoklama: canlı bağlantı varken dakikada bir, yokken birkaç saniyede bir
    useEffect(() => {
        const timer = setInterval(() => {
            if (!document.hidden) void load();
        }, live ? POLL_MS : FALLBACK_POLL_MS);
        return () => clearInterval(timer);
    }, [load, live]);

    // Biten anketin sonucu bir süre görünür, sonra kart kendiliğinden kalkar
    const closedAt = poll?.closedAt ?? null;
    useEffect(() => {
        if (!closedAt) return;
        const left = new Date(closedAt).getTime() + POLL_RESULT_MS - Date.now();
        const t = setTimeout(() => setPoll(null), Math.max(0, left));
        return () => clearTimeout(t);
    }, [closedAt]);

    if (!poll || hidden === poll.id) return null;

    const closed = !!poll.closedAt;
    const mine = myVote?.poll === poll.id ? myVote.option : null;
    const winner = closed ? pollWinner(poll) : null;

    async function vote(option: string) {
        if (!poll || closed || sending || option === mine) return;
        const before = myVote;
        const next = { poll: poll.id, option };
        setMyVote(next);
        setSending(true);
        try {
            const res = await fetch("/api/poll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(next),
            });
            if (!res.ok) {
                const data = (await res.json().catch(() => null)) as { error?: string } | null;
                throw new Error(data?.error ?? "");
            }
            writeVote(next);
            // Canlı sinyal gecikirse diye sayıları kendimiz de tazeleyelim
            setTimeout(() => void load(Date.now()), 1200);
        } catch (e) {
            setMyVote(before);
            toast.error((e as Error).message || "Oy gönderilemedi. Tekrar dokun.");
        } finally {
            setSending(false);
        }
    }

    return (
        <section className="relative z-10 shrink-0 px-5 pt-2" aria-label="Sıradaki şarkı oylaması">
            <div className="rounded-2xl border border-accent/30 bg-accent/[0.07] p-3">
                <div className="flex items-center gap-2">
                    {closed ? (
                        <Trophy size={16} className="shrink-0 text-accent" />
                    ) : (
                        <Vote size={16} className="shrink-0 text-accent" />
                    )}
                    <h2 className="min-w-0 flex-1 truncate text-sm font-extrabold text-ink">
                        {closed ? "Oylama bitti" : "Sıradaki şarkıyı siz seçin"}
                    </h2>
                    <span className="shrink-0 text-xs font-bold text-muted">{poll.total} oy</span>
                    {closed && (
                        <button
                            type="button"
                            onClick={() => setHidden(poll.id)}
                            aria-label="Kapat"
                            className="-mr-1 flex size-7 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-line"
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>
                <p className="mt-0.5 text-xs text-muted" role="status">
                    {closed
                        ? winner
                            ? `Kazanan: ${winner.name}. Birazdan çalıyoruz.`
                            : "Bu sefer oy çıkmadı."
                        : mine
                          ? "Oyun alındı. Fikrini değiştirmek için başka şarkıya dokun."
                          : "Çalmamızı istediğin şarkıya dokun."}
                </p>

                <ul className="mt-2 space-y-1.5">
                    {poll.options.map((o) => {
                        const pct = poll.total ? Math.round((o.votes / poll.total) * 100) : 0;
                        const picked = mine === o.id;
                        const won = winner?.id === o.id;
                        return (
                            <li key={o.id}>
                                <button
                                    type="button"
                                    onClick={() => vote(o.id)}
                                    disabled={closed || sending}
                                    aria-pressed={picked}
                                    aria-label={`${o.name}, ${o.artists}: yüzde ${pct}${picked ? ", senin oyun" : ""}`}
                                    className={`relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl bg-raised p-1.5 text-left transition enabled:active:scale-[0.99] ${
                                        // Açıkken kendi oyum, bitince sadece kazanan çerçevelenir
                                        (closed ? won : picked) ? "ring-2 ring-accent" : "ring-1 ring-line"
                                    }`}
                                >
                                    {/* Oy oranı: satırın arkasında dolan şerit */}
                                    <span
                                        aria-hidden
                                        className="absolute inset-y-0 left-0 bg-accent/20 transition-[width] duration-500 motion-reduce:transition-none"
                                        style={{ width: `${pct}%` }}
                                    />
                                    {o.cover ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={o.cover}
                                            alt=""
                                            width={36}
                                            height={36}
                                            className="relative size-9 shrink-0 rounded-[4px] object-cover"
                                        />
                                    ) : (
                                        <span className="relative size-9 shrink-0 rounded-[4px] bg-line" />
                                    )}
                                    <span className="relative min-w-0 flex-1">
                                        <span className="block truncate text-sm font-bold text-ink">
                                            {o.name}
                                        </span>
                                        <span className="block truncate text-xs text-muted">
                                            {o.artists}
                                        </span>
                                    </span>
                                    {picked && (
                                        <span className="relative flex shrink-0 items-center gap-1 text-xs font-extrabold text-accent">
                                            <Check size={14} strokeWidth={3} />
                                            Oyun
                                        </span>
                                    )}
                                    <span className="relative w-10 shrink-0 text-right text-sm font-extrabold tabular-nums text-ink">
                                        %{pct}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </section>
    );
}
