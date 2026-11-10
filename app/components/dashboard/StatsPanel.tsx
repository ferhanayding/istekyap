"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, RefreshCw, X } from "lucide-react";
import type { NightSummary, SongStat, Stats, StatsResponse } from "@/lib/stats-types";

type Range = "night" | "total";
type ListKey = "requested" | "liked" | "disliked" | "played" | "artists";

const LISTS: { key: ListKey; label: string }[] = [
    { key: "requested", label: "En çok istenen" },
    { key: "liked", label: "En çok beğenilen" },
    { key: "disliked", label: "En çok beğenilmeyen" },
    { key: "played", label: "En çok çalınan" },
    { key: "artists", label: "Sanatçılar" },
];

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
});
const dayFmt = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
});
const fmtDate = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : "—");
const pct = (n: number | null) => (n === null ? "—" : `%${Math.round(n * 100)}`);

function waitText(min: number | null): string {
    if (min === null) return "—";
    if (min < 1) return "1 dk'dan az";
    if (min < 90) return `${Math.round(min)} dk`;
    return `${(min / 60).toFixed(1).replace(".", ",")} sa`;
}

const card = "rounded-lg bg-surface p-4";

export default function StatsPanel() {
    const router = useRouter();
    const [data, setData] = useState<StatsResponse | null>(null);
    const [failed, setFailed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [range, setRange] = useState<Range>("night");
    const [list, setList] = useState<ListKey>("requested");
    const [detail, setDetail] = useState<SongStat | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/dashboard/stats", { cache: "no-store" });
            if (res.status === 401) {
                router.replace("/login");
                return;
            }
            if (!res.ok) throw new Error();
            setData((await res.json()) as StatsResponse);
            setFailed(false);
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        const t = setTimeout(() => void load(), 0);
        return () => clearTimeout(t);
    }, [load]);

    const stats = data ? (range === "night" ? data.night : data.total) : null;

    return (
        <div className="-mx-5 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 pb-4 [scrollbar-color:var(--color-line)_transparent] [scrollbar-width:thin]">
            <div className="flex items-center gap-2">
                <div
                    role="tablist"
                    aria-label="Zaman aralığı"
                    className="flex flex-1 rounded-full bg-raised p-1"
                >
                    {(
                        [
                            ["night", data && !data.nightOpen ? "Son gece" : "Bu gece"],
                            ["total", "Tüm zamanlar"],
                        ] as const
                    ).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={range === key}
                            onClick={() => setRange(key)}
                            className={`h-8 flex-1 rounded-full text-xs font-extrabold transition ${range === key ? "bg-ink text-page" : "text-muted hover:text-ink"
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => void load()}
                    disabled={loading}
                    aria-label="Yenile"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-raised text-ink transition hover:bg-line disabled:opacity-50"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {data && range === "night" && (
                <p className="text-xs text-faint">
                    {!data.since
                        ? "Henüz gece başlatılmadı, hepsi bu gece sayılıyor."
                        : data.until
                            ? `Son gece: ${fmtDate(data.since)} – ${fmtDate(data.until)}. Yeni gece başlayınca sıfırlanır.`
                            : `Gece başlangıcı: ${fmtDate(data.since)}`}
                </p>
            )}

            {failed && !data && (
                <p className="py-10 text-center text-sm text-muted">
                    İstatistikler alınamadı.{" "}
                    <button type="button" onClick={() => void load()} className="font-bold text-ink">
                        Tekrar dene
                    </button>
                </p>
            )}

            {!stats && !failed && (
                <div className="grid grid-cols-2 gap-2" aria-label="Yükleniyor">
                    {Array.from({ length: 6 }, (_, i) => (
                        <div key={i} className="h-[76px] animate-pulse rounded-lg bg-surface" />
                    ))}
                </div>
            )}

            {stats && (
                <>
                    <Summary stats={stats} />
                    <HourChart hours={stats.hours} />
                    <TopLists stats={stats} list={list} onList={setList} onSong={setDetail} />
                    {range === "total" && <Nights nights={data?.nights ?? []} />}
                </>
            )}

            {detail && <SongDetail song={detail} onClose={() => setDetail(null)} />}
        </div>
    );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="rounded-lg bg-surface px-4 py-3">
            <p className="text-xs font-bold text-muted">{label}</p>
            <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-ink">{value}</p>
            {sub && <p className="text-xs text-faint">{sub}</p>}
        </div>
    );
}

function Summary({ stats: s }: { stats: Stats }) {
    return (
        <div className="grid grid-cols-2 gap-2">
            <Tile label="Toplam istek" value={String(s.totalRequests)} sub={`${s.requestedSongs} farklı şarkı`} />
            <Tile label="İstek atan kişi" value={String(s.people)} sub="farklı cihaz" />
            <Tile label="Onay oranı" value={pct(s.approvalRate)} sub="onaylanan / karar verilen" />
            <Tile label="Çalınan" value={String(s.plays)} sub="şarkı çalındı" />
            <Tile label="Beğeni" value={`${s.likes} / ${s.dislikes}`} sub="👍 / 👎" />
            <Tile label="Bekleme süresi" value={waitText(s.medianWaitMin)} sub="istekten çalınmaya (ortanca)" />
            <div className="col-span-2">
                <Tile
                    label="Yorumlar"
                    value={s.avgRating === null ? "—" : `★ ${s.avgRating.toFixed(1).replace(".", ",")}`}
                    sub={`${s.comments} yorum`}
                />
            </div>
        </div>
    );
}

function HourChart({ hours }: { hours: number[] }) {
    const [hover, setHover] = useState<number | null>(null);
    const max = Math.max(...hours);
    const peak = max > 0 ? hours.indexOf(max) : -1;
    // 12:00'den başlat: gece etkinliğinde yoğunluk ortada görünür
    const order = Array.from({ length: 24 }, (_, i) => (i + 12) % 24);
    const label = (h: number) => `${String(h).padStart(2, "0")}:00`;
    const shown = hover ?? peak;

    return (
        <div className={card}>
            <div className="flex items-baseline justify-between gap-2">
                <p className="text-base font-bold text-ink">Saat saat istekler</p>
                <p className="text-xs text-muted" aria-live="polite">
                    {shown >= 0
                        ? `${label(shown)}–${label((shown + 1) % 24)} · ${hours[shown]} istek${hover === null ? " (en yoğun)" : ""}`
                        : "Henüz istek yok"}
                </p>
            </div>
            <div className="mt-4 flex h-28 items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
                {order.map((h) => {
                    const v = hours[h];
                    const height = max > 0 ? Math.max((v / max) * 100, v > 0 ? 4 : 0) : 0;
                    const active = shown === h;
                    return (
                        <button
                            key={h}
                            type="button"
                            onMouseEnter={() => setHover(h)}
                            onFocus={() => setHover(h)}
                            onBlur={() => setHover(null)}
                            onClick={() => setHover(h)}
                            aria-label={`${label(h)}: ${v} istek`}
                            className="flex h-full flex-1 items-end"
                        >
                            <span
                                className={`block w-full rounded-t-[4px] transition-colors ${active ? "bg-accent" : "bg-faint/60"
                                    }`}
                                style={{ height: `${height}%` }}
                            />
                        </button>
                    );
                })}
            </div>
            <div className="mt-1.5 grid grid-cols-6 border-t border-line pt-1.5 text-xs tabular-nums text-faint">
                {[12, 16, 20, 0, 4, 8].map((h) => (
                    <span key={h}>{label(h)}</span>
                ))}
            </div>
        </div>
    );
}

type Row = { key: string; name: string; sub: string; cover: string | null; value: string; song?: SongStat };

function rows(stats: Stats, list: ListKey): Row[] {
    const songRow = (s: SongStat, value: string): Row => ({
        key: s.id,
        name: s.name,
        sub: s.artists,
        cover: s.cover,
        value,
        song: s,
    });
    const top = (pickVal: (s: SongStat) => number, unit: string) =>
        stats.songs
            .filter((s) => pickVal(s) > 0)
            .sort((a, b) => pickVal(b) - pickVal(a) || (b.lastRequested ?? "").localeCompare(a.lastRequested ?? ""))
            .slice(0, 10)
            .map((s) => songRow(s, `${pickVal(s)} ${unit}`));

    switch (list) {
        case "requested":
            return top((s) => s.requests, "istek");
        case "liked":
            return top((s) => s.likes, "👍");
        case "disliked":
            return top((s) => s.dislikes, "👎");
        case "played":
            return top((s) => s.plays, "kez");
        case "artists": {
            const by = new Map<string, { requests: number; songs: number }>();
            for (const s of stats.songs) {
                if (!s.requests) continue;
                for (const a of s.artists.split(",").map((x) => x.trim()).filter(Boolean)) {
                    const cur = by.get(a) ?? { requests: 0, songs: 0 };
                    cur.requests += s.requests;
                    cur.songs++;
                    by.set(a, cur);
                }
            }
            return [...by.entries()]
                .sort((a, b) => b[1].requests - a[1].requests)
                .slice(0, 10)
                .map(([name, v]) => ({
                    key: name,
                    name,
                    sub: `${v.songs} farklı şarkı`,
                    cover: null,
                    value: `${v.requests} istek`,
                }));
        }
    }
}

function TopLists({
    stats,
    list,
    onList,
    onSong,
}: {
    stats: Stats;
    list: ListKey;
    onList: (k: ListKey) => void;
    onSong: (s: SongStat) => void;
}) {
    const items = useMemo(() => rows(stats, list), [stats, list]);
    return (
        <div className={card}>
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
                {LISTS.map((l) => (
                    <button
                        key={l.key}
                        type="button"
                        onClick={() => onList(l.key)}
                        aria-pressed={list === l.key}
                        className={`h-8 shrink-0 rounded-full px-3 text-xs font-bold transition ${list === l.key
                            ? "bg-ink text-page"
                            : "bg-raised text-ink hover:bg-line"
                            }`}
                    >
                        {l.label}
                    </button>
                ))}
            </div>

            {items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">Henüz veri yok.</p>
            ) : (
                <ol className="mt-2">
                    {items.map((r, i) => {
                        const inner = (
                            <>
                                <span className="w-5 shrink-0 text-center text-xs font-extrabold tabular-nums text-faint">
                                    {i + 1}
                                </span>
                                {r.cover ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                loading="lazy"
                decoding="async" src={r.cover} alt="" className="size-10 shrink-0 rounded-[4px] object-cover" />
                                ) : (
                                    <span className="size-10 shrink-0 rounded-[4px] bg-line" />
                                )}
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-ink">{r.name}</span>
                                    <span className="block truncate text-xs text-muted">{r.sub}</span>
                                </span>
                                <span className="shrink-0 text-sm font-extrabold tabular-nums text-ink">
                                    {r.value}
                                </span>
                            </>
                        );
                        return (
                            <li key={r.key}>
                                {r.song ? (
                                    <button
                                        type="button"
                                        onClick={() => onSong(r.song!)}
                                        className="flex w-full items-center gap-3 rounded-lg px-1 py-2 text-left transition hover:bg-surface"
                                    >
                                        {inner}
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-3 px-1 py-2">{inner}</div>
                                )}
                            </li>
                        );
                    })}
                </ol>
            )}
        </div>
    );
}

const STATUS_TEXT: Record<string, string> = {
    pending: "Bekledi",
    approved: "Onaylı",
    played: "Çalındı",
    rejected: "Reddedildi",
};

function Nights({ nights }: { nights: NightSummary[] }) {
    const [open, setOpen] = useState<string | null>(null);
    return (
        <div className={card}>
            <p className="text-base font-bold text-ink">Geçmiş geceler</p>
            {nights.length === 0 ? (
                <p className="mt-1 text-xs text-muted">
                    &quot;Geceyi bitir&quot;e her bastığında o gece buraya eklenir.
                </p>
            ) : (
                <ul className="mt-2 divide-y divide-line">
                    {nights.map((n) => {
                        const isOpen = open === n.archivedAt;
                        return (
                            <li key={n.archivedAt}>
                                <button
                                    type="button"
                                    onClick={() => setOpen(isOpen ? null : n.archivedAt)}
                                    aria-expanded={isOpen}
                                    className="flex w-full items-center gap-3 py-3 text-left"
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-bold capitalize text-ink">
                                            {dayFmt.format(new Date(n.startedAt))}
                                        </span>
                                        <span className="block text-xs text-muted">
                                            {n.requests} istek · {n.songs.length} şarkı · {n.played} çalındı
                                            {n.rejected ? ` · ${n.rejected} reddedildi` : ""}
                                        </span>
                                    </span>
                                    <ChevronDown
                                        size={18}
                                        className={`shrink-0 text-muted transition ${isOpen ? "rotate-180" : ""}`}
                                    />
                                </button>
                                {isOpen && (
                                    <ol className="mb-3 space-y-1.5">
                                        {n.songs.map((s) => (
                                            <li key={s.id} className="flex items-center gap-2 text-sm">
                                                <span className="min-w-0 flex-1 truncate text-ink">
                                                    {s.name} <span className="text-faint">· {s.artists}</span>
                                                </span>
                                                <span className="shrink-0 text-xs text-muted">
                                                    {STATUS_TEXT[s.status] ?? s.status}
                                                </span>
                                                {s.count > 1 && (
                                                    <span className="shrink-0 rounded-full bg-raised px-2 py-0.5 text-xs font-extrabold text-ink">
                                                        ×{s.count}
                                                    </span>
                                                )}
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

function SongDetail({ song: s, onClose }: { song: SongStat; onClose: () => void }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    const votes = s.likes + s.dislikes;
    const items: [string, string][] = [
        ["Toplam istek", String(s.requests)],
        ["Kaç gecede istendi", String(s.nights)],
        ["Onaylandı", String(s.approved)],
        ["Reddedildi", String(s.rejected)],
        ["Çalındı", `${s.plays} kez`],
        ["Beğeni oranı", votes ? `%${Math.round((s.likes / votes) * 100)}` : "—"],
        ["👍 Beğeni", String(s.likes)],
        ["👎 Beğenmeme", String(s.dislikes)],
    ];

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`${s.name} istatistikleri`}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-6"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="max-h-[90dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl border border-line bg-page p-5 shadow-2xl sm:rounded-3xl"
            >
                <div className="flex items-center gap-3">
                    {s.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                loading="lazy"
                decoding="async" src={s.cover} alt="" className="size-14 shrink-0 rounded-md object-cover" />
                    ) : (
                        <span className="size-14 shrink-0 rounded-md bg-line" />
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-extrabold text-ink">{s.name}</p>
                        <p className="truncate text-xs text-muted">{s.artists}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Kapat"
                        autoFocus
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-raised text-ink transition hover:bg-line"
                    >
                        <X size={18} />
                    </button>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-2">
                    {items.map(([k, v]) => (
                        <div key={k} className="rounded-lg bg-surface px-3 py-2.5">
                            <dt className="text-xs font-bold text-muted">{k}</dt>
                            <dd className="text-lg font-extrabold tabular-nums text-ink">{v}</dd>
                        </div>
                    ))}
                </dl>
                <dl className="mt-3 space-y-1.5 text-sm">
                    {(
                        [
                            ["İlk istek", fmtDate(s.firstRequested)],
                            ["Son istek", fmtDate(s.lastRequested)],
                            ["Son çalınma", fmtDate(s.lastPlayed)],
                        ] as const
                    ).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3">
                            <dt className="text-muted">{k}</dt>
                            <dd className="font-semibold text-ink">{v}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </div>
    );
}
