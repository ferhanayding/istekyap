"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { useLive } from "@/lib/live-client";
import { timeAgo, useT } from "@/lib/i18n";
import {
    COMMENT_SENT_EVENT,
    type CommentsResponse,
    type PublicComment,
} from "@/lib/visitor-types";
import CommentButton from "./CommentButton";

// Herkese açık yorumlar: ortalama puan ve en yeni yazılı yorumlar.
// Sekme ilk açıldığında yüklenir; açıkken yeni yorum gelince ya da silinince tazelenir.
export default function CommentsTab({ active }: { active: boolean }) {
    const [data, setData] = useState<CommentsResponse | null>(null);
    const [failed, setFailed] = useState(false);
    const [now, setNow] = useState(0);
    const t = useT();

    // v: canlı sinyalin sürümü (herkes aynı adresi ister, CDN tek cevap verir)
    const load = useCallback(async (v?: number) => {
        try {
            const res = await fetch(v ? `/api/comments?v=${v}` : "/api/comments");
            const d = (await res.json()) as CommentsResponse | null;
            if (!res.ok || !d || !Array.isArray(d.items)) throw new Error();
            setData(d);
            setFailed(false);
            setNow(Date.now());
        } catch {
            setFailed(true);
        }
    }, []);

    // Sekmeye her geçişte tazele
    useEffect(() => {
        if (!active) return;
        const timer = setTimeout(() => void load(), 0);
        return () => clearTimeout(timer);
    }, [active, load]);

    const activeRef = useRef(active);
    useEffect(() => {
        activeRef.current = active;
    }, [active]);
    useLive("comments", (v) => {
        if (activeRef.current) void load(v);
    });

    // Kendi yorumum hemen görünsün (canlı sinyali beklemeden, önbelleği atlayarak)
    useEffect(() => {
        const onSent = () => void load(Date.now());
        window.addEventListener(COMMENT_SENT_EVENT, onSent);
        return () => window.removeEventListener(COMMENT_SENT_EVENT, onSent);
    }, [load]);

    return (
        <section className="relative mt-2 flex min-h-0 flex-1 flex-col px-5">
            {/* Ortalama ve "Yorum yap" */}
            <div className="mb-1.5 flex shrink-0 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
                <span className="text-3xl font-extrabold leading-none tracking-tight tabular-nums">
                    {data && data.count > 0 ? data.average.toFixed(1) : "–"}
                </span>
                <span className="min-w-0 flex-1">
                    <Stars value={data?.average ?? 0} size={14} />
                    <span className="mt-1 block truncate text-xs text-muted">
                        {t("{n} değerlendirme", { n: data?.count ?? 0 })}
                    </span>
                </span>
                <CommentButton />
            </div>

            <div
                data-scroll-list
                className="-mx-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 [scrollbar-color:var(--color-line)_transparent] [scrollbar-width:thin]"
            >
                {failed && !data ? (
                    <p className="mt-2 rounded-lg bg-surface p-4 text-sm text-muted">
                        {t("Yorumlar alınamadı.")}{" "}
                        <button
                            type="button"
                            onClick={() => void load()}
                            className="font-bold text-ink"
                        >
                            {t("Tekrar dene")}
                        </button>
                    </p>
                ) : !data ? (
                    <CommentsLoading />
                ) : data.items.length === 0 ? (
                    <p className="mt-2 rounded-lg bg-surface p-4 text-sm text-muted">
                        {t("Henüz yorum yok. İlk yorumu sen yaz!")}
                    </p>
                ) : (
                    <ul>
                        {data.items.map((c) => (
                            <CommentItem key={c.id} c={c} now={now} />
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}

function CommentItem({ c, now }: { c: PublicComment; now: number }) {
    const t = useT();
    const name = c.name || t("Anonim");
    return (
        <li className="border-b border-line/60 py-3 last:border-b-0">
            <div className="flex items-center gap-2.5">
                <span
                    aria-hidden
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold uppercase ${
                        c.name ? "bg-accent/15 text-accent" : "bg-raised text-muted"
                    }`}
                >
                    {c.name ? Array.from(c.name)[0] : "?"}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink">{name}</span>
                    <span className="mt-0.5 flex items-center gap-2">
                        <Stars value={c.rating} size={11} />
                        {now > 0 && (
                            <span className="truncate text-xs text-faint">
                                {timeAgo(t, c.createdAt, now)}
                            </span>
                        )}
                    </span>
                </span>
            </div>
            <p className="mt-2 whitespace-pre-line break-words pl-[42px] text-sm leading-relaxed text-ink">
                {c.message}
            </p>
        </li>
    );
}

// 4.6 → dört dolu, biri yarıdan fazla dolu
function Stars({ value, size }: { value: number; size: number }) {
    const t = useT();
    const rounded = Math.round(value * 2) / 2;
    return (
        <span
            className="flex items-center gap-0.5"
            role="img"
            aria-label={t("5 üzerinden {n}", { n: rounded })}
        >
            {[1, 2, 3, 4, 5].map((n) => {
                const fill = rounded >= n ? 1 : rounded >= n - 0.5 ? 0.5 : 0;
                return (
                    <span key={n} className="relative inline-flex" aria-hidden>
                        <Star size={size} strokeWidth={2} className="text-faint" />
                        {fill > 0 && (
                            <span
                                className="absolute inset-y-0 left-0 overflow-hidden"
                                style={{ width: `${fill * 100}%` }}
                            >
                                <Star
                                    size={size}
                                    strokeWidth={2}
                                    className="text-accent"
                                    fill="currentColor"
                                />
                            </span>
                        )}
                    </span>
                );
            })}
        </span>
    );
}

function CommentsLoading() {
    return (
        <div className="space-y-3 pt-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex animate-pulse gap-2.5">
                    <div className="size-8 shrink-0 rounded-full bg-raised" />
                    <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 w-1/3 rounded bg-raised" />
                        <div className="h-3 w-5/6 rounded bg-raised" />
                        <div className="h-3 w-2/3 rounded bg-raised" />
                    </div>
                </div>
            ))}
        </div>
    );
}
