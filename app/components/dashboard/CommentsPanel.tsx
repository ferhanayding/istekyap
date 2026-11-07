"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Trash2 } from "lucide-react";
import LoadingTracks from "../LoadingTracks";
import { useToast } from "../Toast";

type Comment = {
    id: string;
    rating: number;
    message: string;
    name: string;
    created_at: string;
};

type Data = {
    items: Comment[];
    count: number;
    average: number;
    distribution: number[]; // 1 yıldızdan 5 yıldıza
};

const POLL_MS = 20_000;
const rtf = new Intl.RelativeTimeFormat("tr", { numeric: "auto" });

function ago(iso: string, now: number): string {
    const s = Math.min(0, Math.round((new Date(iso).getTime() - now) / 1000));
    if (Math.abs(s) < 60) return "az önce";
    const m = Math.round(s / 60);
    if (Math.abs(m) < 60) return rtf.format(m, "minute");
    const h = Math.round(m / 60);
    if (Math.abs(h) < 24) return rtf.format(h, "hour");
    return rtf.format(Math.round(h / 24), "day");
}

function Stars({ value, size }: { value: number; size: number }) {
    return (
        <span className="inline-flex items-center gap-0.5" aria-label={`${value} yıldız`}>
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    size={size}
                    strokeWidth={1.8}
                    className={n <= Math.round(value) ? "text-[#FFBD59]" : "text-[#5F5875]"}
                    fill={n <= Math.round(value) ? "currentColor" : "none"}
                />
            ))}
        </span>
    );
}

export default function CommentsPanel() {
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [now, setNow] = useState(0);
    const [busyId, setBusyId] = useState<string | null>(null);
    const router = useRouter();
    const toast = useToast();

    useEffect(() => {
        if (error) toast.error(error);
    }, [error, toast]);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/dashboard/comments", { cache: "no-store" });
            if (res.status === 401) {
                router.replace("/login");
                return;
            }
            const json: unknown = await res.json();
            if (!res.ok || typeof json !== "object" || json === null) throw new Error();
            setData(json as Data);
            setNow(Date.now());
            setError(null);
        } catch {
            setError("Yorumlar güncellenemedi, tekrar denenecek.");
        }
    }, [router]);

    useEffect(() => {
        const first = setTimeout(() => load(), 0);
        const timer = setInterval(() => {
            if (!document.hidden) load();
        }, POLL_MS);
        return () => {
            clearTimeout(first);
            clearInterval(timer);
        };
    }, [load]);

    async function remove(id: string) {
        if (!window.confirm("Bu yorum silinsin mi?")) return;
        setBusyId(id);
        try {
            const res = await fetch(`/api/dashboard/comments?id=${id}`, {
                method: "DELETE",
            });
            if (res.status === 401) {
                router.replace("/login");
                return;
            }
            if (!res.ok) throw new Error();
            await load();
        } catch {
            setError("Silinemedi.");
        } finally {
            setBusyId(null);
        }
    }

    if (data === null) return <LoadingTracks />;

    const max = Math.max(1, ...data.distribution);

    return (
        <div className="-mx-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 [scrollbar-color:#3A3270_transparent] [scrollbar-width:thin]">
            {/* Genel puan */}
            <div className="mb-2 flex items-center gap-5 rounded-lg bg-white/[0.05] p-4">
                <div className="shrink-0 text-center">
                    <p className="text-5xl font-extrabold leading-none tracking-tight">
                        {data.count ? data.average.toFixed(1) : "–"}
                    </p>
                    <div className="mt-2 flex justify-center">
                        <Stars value={data.average} size={14} />
                    </div>
                    <p className="mt-1 text-xs text-[#B3B3B3]">{data.count} yorum</p>
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                    {[5, 4, 3, 2, 1].map((n) => (
                        <div key={n} className="flex items-center gap-2 text-[11px] text-[#B3B3B3]">
                            <span className="w-3 text-right font-bold">{n}</span>
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.09]">
                                <div
                                    className="h-full rounded-full bg-[#FFBD59]"
                                    style={{ width: `${(data.distribution[n - 1] / max) * 100}%` }}
                                />
                            </div>
                            <span className="w-6 text-right tabular-nums">
                                {data.distribution[n - 1]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {data.items.length === 0 ? (
                <p className="mt-2 rounded-lg bg-white/[0.05] p-4 text-sm text-[#B3B3B3]">
                    Henüz yorum yok. Ziyaretçiler siteden yorum bırakınca burada görünür.
                </p>
            ) : (
                <ul>
                    {data.items.map((c) => (
                        <li
                            key={c.id}
                            className="mb-2 flex items-start gap-3 rounded-lg bg-white/[0.05] p-3"
                        >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#7555E9]/40 text-sm font-extrabold uppercase text-white">
                                {(c.name || "A").slice(0, 1)}
                            </span>

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <span className="truncate text-sm font-bold">
                                        {c.name || "Anonim"}
                                    </span>
                                    <Stars value={c.rating} size={13} />
                                    <span className="text-[11px] text-[#7C7794]">
                                        {ago(c.created_at, now)}
                                    </span>
                                </div>
                                {c.message ? (
                                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[#D8D3EC]">
                                        {c.message}
                                    </p>
                                ) : (
                                    <p className="mt-1 text-xs italic text-[#7C7794]">
                                        Sadece puan verdi.
                                    </p>
                                )}
                            </div>

                            <button
                                type="button"
                                disabled={busyId === c.id}
                                onClick={() => remove(c.id)}
                                aria-label="Yorumu sil"
                                className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#B3B3B3] transition hover:bg-[#FF729B]/15 hover:text-[#FF8FB0] disabled:opacity-50"
                            >
                                <Trash2 size={16} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
