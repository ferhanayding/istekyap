"use client";

import { useRouter } from "next/navigation";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    BarChart3,
    Check,
    CheckCheck,
    ListMusic,
    LogOut,
    MessageSquareText,
    Music2,
    Play,
    RefreshCw,
    SlidersHorizontal,
    Square,
    Trash2,
    Undo2,
    Volume2,
    VolumeX,
    X,
} from "lucide-react";
import { logout } from "@/app/login/actions";
import { useDashboardSystem } from "@/lib/use-dashboard-system";
import { useLive } from "@/lib/live-client";
import EqBars from "../EqBars";
import { ToastProvider, useToast } from "../Toast";
import LoadingTracks from "../LoadingTracks";
import CommentsPanel from "./CommentsPanel";
import LyricsBar from "./LyricsBar";
import { LyricsProvider, LyricsButton } from "../LyricsSheet";
import SongStats from "./SongStats";
import SystemPanel from "./SystemPanel";
import StatsPanel from "./StatsPanel";

type Status = "pending" | "approved" | "played" | "rejected";
type Main = "requests" | "playlist" | "stats" | "comments" | "system";
type Tab = Status | "all";

const STATUS_ORDER: Record<Status, number> = {
    pending: 0,
    approved: 1,
    played: 2,
    rejected: 3,
};

const STATUS_BADGE: Record<Status, { text: string; className: string }> = {
    pending: { text: "Bekliyor", className: "bg-raised text-muted" },
    approved: { text: "Onaylı", className: "bg-accent/15 text-accent" },
    played: { text: "Çalındı", className: "bg-raised text-ink" },
    rejected: { text: "Reddedildi", className: "bg-danger/15 text-danger" },
};

// Çok istenen üstte; sort kararlı, eşitler yeniden eskiye kalır
const byCount = (a: RequestRow, b: RequestRow) =>
    (b.request_count ?? 1) - (a.request_count ?? 1);

type RequestRow = {
    id: string;
    spotify_id: string;
    name: string;
    artists: string;
    cover: string | null;
    status: Status;
    request_count?: number;
    created_at: string;
    last_requested_at?: string;
};

// Yeni istek canlı sinyalle anında gelir; yoklama sadece yedek
const POLL_MS = 60_000;
const FALLBACK_POLL_MS = 10_000;
const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: "Hepsi" },
    { key: "pending", label: "Bekleyen" },
    { key: "approved", label: "Onaylı" },
    { key: "played", label: "Çalındı" },
    { key: "rejected", label: "Reddedilen" },
];

const MAIN_TABS: { key: Main; label: string; Icon: typeof ListMusic }[] = [
    { key: "requests", label: "İstekler", Icon: ListMusic },
    { key: "playlist", label: "Playlist", Icon: Music2 },
    { key: "stats", label: "İstatistik", Icon: BarChart3 },
    { key: "comments", label: "Yorumlar", Icon: MessageSquareText },
    { key: "system", label: "Sistem", Icon: SlidersHorizontal },
];

const EMPTY: Record<Tab, string> = {
    all: "Henüz istek yok.",
    pending: "Bekleyen istek yok. Yeni istek gelince burada görünür.",
    approved: "Onaylanmış, çalınmayı bekleyen istek yok.",
    played: "Henüz çalınan istek yok.",
    rejected: "Reddedilen istek yok.",
};

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

const btn =
    "flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-extrabold transition active:scale-95 disabled:opacity-50";
const iconBtn =
    "flex size-9 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-50";
const headBtn =
    "flex size-9 items-center justify-center rounded-full bg-raised text-ink transition hover:bg-line";

// Çalan şarkı: listenin altında sabit, Durdur butonuyla
function DashPlayer({
    title,
    cover,
    busy,
    onStop,
}: {
    title: string | null;
    cover: string | null;
    busy: boolean;
    onStop: () => void;
}) {
    const cut = title ? title.lastIndexOf(" · ") : -1;
    const name = title ? (cut > 0 ? title.slice(0, cut) : title) : "Şarkı";
    const artists = title && cut > 0 ? title.slice(cut + 3) : "";

    return (
        <div className="relative mx-2 mb-1.5 shrink-0 rounded-xl border border-line bg-raised">
            <div className="flex items-center gap-3 p-2">
                {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                loading="lazy"
                decoding="async"
                        src={cover}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 shrink-0 rounded-[4px] object-cover"
                    />
                ) : (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[4px] bg-line">
                        <Music2 size={18} />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{name}</p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-muted">
                        <EqBars className="shrink-0" />
                        <span className="shrink-0 font-bold text-accent">Çalıyor</span>
                        {artists && <span className="truncate">· {artists}</span>}
                    </p>
                </div>
                <LyricsButton name={name} artists={artists} />
                <button
                    type="button"
                    disabled={busy}
                    onClick={onStop}
                    aria-label="Durdur"
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-danger/15 px-3.5 text-xs font-extrabold text-danger transition active:scale-95 disabled:opacity-50"
                >
                    <Square size={12} fill="currentColor" />
                    Durdur
                </button>
            </div>
        </div>
    );
}

// Seçili sekme bu tarayıcıda hatırlanır: sayfa yenilenince aynı sekmede açılır
function useStoredTab<T extends string>(
    key: string,
    fallback: T,
    allowed: readonly { key: T }[]
) {
    const [value, setValue] = useState<T>(fallback);
    useEffect(() => {
        const t = setTimeout(() => {
            try {
                const saved = localStorage.getItem(key);
                if (saved && allowed.some((a) => a.key === saved)) setValue(saved as T);
            } catch {
                // Gizli sekme vb.: varsayılanda kal
            }
        }, 0);
        return () => clearTimeout(t);
    }, [key, allowed]);
    const set = useCallback(
        (next: T) => {
            setValue(next);
            try {
                localStorage.setItem(key, next);
            } catch {
                // yazılamazsa sadece hatırlanmaz
            }
        },
        [key]
    );
    return [value, set] as const;
}

function DashboardInner() {
    const [items, setItems] = useState<RequestRow[] | null>(null);
    const [main, setMain] = useStoredTab<Main>("dash-main", "requests", MAIN_TABS);
    const [tab, setTab] = useStoredTab<Tab>("dash-tab", "all", TABS);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [newIds, setNewIds] = useState<Set<string>>(new Set());
    const [sound, setSound] = useState(false);
    const [now, setNow] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();
    const toast = useToast();
    const system = useDashboardSystem();
    const nowPlaying = system.state?.nowPlaying ?? null;

    // Tüm hata mesajları toast olarak gelir
    const shownError = error ?? system.error;
    useEffect(() => {
        if (shownError) toast.error(shownError);
    }, [shownError, toast]);

    const known = useRef<Set<string> | null>(null);
    const audio = useRef<AudioContext | null>(null);
    const soundOn = useRef(false);

    const beep = useCallback(() => {
        const ctx = audio.current;
        if (!ctx || !soundOn.current) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
    }, []);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/dashboard/requests", { cache: "no-store" });
            if (res.status === 401) {
                router.replace("/login");
                return;
            }
            const data: unknown = await res.json();
            if (!res.ok || !Array.isArray(data)) throw new Error();

            const list = data as RequestRow[];
            const prev = known.current;
            const fresh = prev
                ? list.filter((r) => r.status === "pending" && !prev.has(r.id))
                : [];
            known.current = new Set(list.map((r) => r.id));

            setItems(list);
            setNow(Date.now());
            setError(null);

            if (fresh.length > 0) {
                setNewIds((s) => new Set([...s, ...fresh.map((r) => r.id)]));
                beep();
            }
        } catch {
            setError("Liste güncellenemedi, tekrar denenecek.");
        }
    }, [beep, router]);

    // Yeni istek gelince anında yenilenir. Dashboard arka plandayken de çalışır:
    // ses çalar, yeni istek sayısı sekme başlığına yazılır.
    const live = useLive("requests", () => load(), { whenHidden: true });

    useEffect(() => {
        const first = setTimeout(() => load(), 0);
        return () => clearTimeout(first);
    }, [load]);

    useEffect(() => {
        const timer = setInterval(() => load(), live ? POLL_MS : FALLBACK_POLL_MS);
        return () => clearInterval(timer);
    }, [load, live]);

    useEffect(() => {
        document.title =
            newIds.size > 0
                ? `(${newIds.size}) Yeni istek · İstekYap`
                : "Dashboard · İstekYap";
    }, [newIds]);

    function dismiss(id: string) {
        setNewIds((s) => {
            const next = new Set(s);
            next.delete(id);
            return next;
        });
    }

    function toggleSound() {
        if (sound) {
            soundOn.current = false;
            setSound(false);
            return;
        }
        if (!audio.current) audio.current = new AudioContext();
        void audio.current.resume();
        soundOn.current = true;
        setSound(true);
        beep();
    }

    async function refresh() {
        setRefreshing(true);
        await Promise.all([load(), system.load()]);
        setRefreshing(false);
    }

    // Çal: öncekini otomatik durdurur, çalan istekse listesi yenilenir
    async function play(id: string, title: string) {
        if (await system.act({ action: "play", id, title })) {
            toast.success(`Çalıyor: ${title}`);
            void load();
        }
    }

    async function stop() {
        if (await system.act({ action: "stop" })) {
            toast.info("Durduruldu.");
            void load();
        }
    }

    async function changeStatus(id: string, status: Status) {
        const row = items?.find((r) => r.id === id);
        setBusyId(id);
        setError(null);
        try {
            const res = await fetch(`/api/dashboard/requests/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (res.status === 401) {
                router.replace("/login");
                return;
            }
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                setError(data?.error ?? "İşlem yapılamadı.");
                return;
            }
            setItems((list) =>
                list ? list.map((r) => (r.id === id ? { ...r, status } : r)) : list
            );
            dismiss(id);
            // Çalan istek elle başka duruma alınırsa çalma işareti de kalksın
            if (row && nowPlaying === row.spotify_id) {
                await system.act({ action: "stop" });
            }
        } catch {
            setError("İşlem yapılamadı.");
        } finally {
            setBusyId(null);
        }
    }

    async function remove(id: string) {
        if (!window.confirm("Bu isteği silmek istediğine emin misin?")) return;
        const row = items?.find((r) => r.id === id);
        setBusyId(id);
        setError(null);
        try {
            const res = await fetch(`/api/dashboard/requests/${id}`, {
                method: "DELETE",
            });
            if (res.status === 401) {
                router.replace("/login");
                return;
            }
            if (!res.ok) {
                setError("Silinemedi.");
                return;
            }
            setItems((list) => (list ? list.filter((r) => r.id !== id) : list));
            dismiss(id);
            if (row && nowPlaying === row.spotify_id) {
                await system.act({ action: "stop" });
            }
        } catch {
            setError("Silinemedi.");
        } finally {
            setBusyId(null);
        }
    }

    const count = (s: Tab) =>
        s === "all"
            ? (items?.length ?? 0)
            : (items?.filter((r) => r.status === s).length ?? 0);
    const visible =
        tab === "all"
            ? [...(items ?? [])].sort(
                (a, b) =>
                    STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || byCount(a, b)
            )
            : (items?.filter((r) => r.status === tab) ?? []).sort(byCount);

    // Çalan şarkının kapağı: sistemden, yoksa istek listesinden
    const playingCover =
        system.state?.nowPlayingCover ??
        items?.find((r) => r.spotify_id === nowPlaying)?.cover ??
        null;

    return (
        <div className="relative mx-auto flex h-dvh max-w-2xl flex-col overflow-hidden">

            <header className="relative shrink-0 px-5 pb-2 pt-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-baseline gap-2">
                        <h1 className="text-[26px] font-extrabold leading-none tracking-[-1.2px]">
                            Dashboard<span className="text-accent">.</span>
                        </h1>
                        <span className="truncate text-xs font-bold uppercase tracking-[2.5px] text-muted">
                            LƏYSAN
                        </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={toggleSound}
                            aria-label={sound ? "Bildirim sesini kapat" : "Bildirim sesini aç"}
                            aria-pressed={sound}
                            className={`flex size-9 items-center justify-center rounded-full transition ${sound
                                ? "bg-accent/20 text-accent"
                                : "bg-raised text-ink hover:bg-line"
                                }`}
                        >
                            {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
                        </button>
                        <button
                            type="button"
                            onClick={refresh}
                            aria-label="Yenile"
                            className={headBtn}
                        >
                            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                        </button>
                        <form action={logout}>
                            <button aria-label="Çıkış yap" className={headBtn}>
                                <LogOut size={16} />
                            </button>
                        </form>
                    </div>
                </div>

                <p className="mt-1 text-xs leading-snug text-muted">
                    {items ? `${count("pending")} bekleyen istek` : "…"} ·{" "}
                    {live ? (
                        <span className="text-accent">canlı</span>
                    ) : (
                        `${FALLBACK_POLL_MS / 1000} saniyede bir güncellenir`
                    )}
                </p>
            </header>

            {/* Şarkı araması: her sekmede sabit */}
            <LyricsBar
                nowPlaying={nowPlaying}
                busy={system.busy}
                onPlay={play}
                onStop={stop}
            />

            <div className="relative flex min-h-0 flex-1 flex-col px-5">
                {main === "system" ? (
                    <SystemPanel system={system} onChanged={() => void load()} />
                ) : main === "comments" ? (
                    <CommentsPanel />
                ) : main === "stats" ? (
                    <StatsPanel />
                ) : main === "playlist" ? (
                    <SongStats
                        nowPlaying={nowPlaying}
                        played={system.state?.played ?? []}
                        busy={system.busy}
                        onPlay={play}
                        onStop={stop}
                    />
                ) : (
                    <>
                        {newIds.size > 0 && (
                            <div className="mb-2 flex shrink-0 items-center justify-between gap-3 rounded-lg bg-raised px-4 py-2.5 text-sm font-bold">
                                <span>{newIds.size} yeni istek geldi</span>
                                <button
                                    type="button"
                                    onClick={() => setNewIds(new Set())}
                                    className="text-xs font-bold text-ink hover:text-ink"
                                >
                                    Hepsini gördüm
                                </button>
                            </div>
                        )}

                        <div
                            className="mb-1 flex shrink-0 gap-2 overflow-x-auto pb-2 [scrollbar-color:var(--color-line)_transparent] [scrollbar-width:thin]"
                            role="tablist"
                        >
                            {TABS.map((t) => (
                                <button
                                    key={t.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === t.key}
                                    onClick={() => setTab(t.key)}
                                    className={`h-8 shrink-0 rounded-full px-3.5 text-xs font-bold transition ${tab === t.key
                                        ? "bg-accent text-on-accent"
                                        : "bg-raised text-ink hover:bg-line"
                                        }`}
                                >
                                    {t.label} <span className="opacity-70">{count(t.key)}</span>
                                </button>
                            ))}
                        </div>

                        <div className="-mx-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 [scrollbar-color:var(--color-line)_transparent] [scrollbar-width:thin]">
                            {items === null ? (
                                <LoadingTracks />
                            ) : visible.length === 0 ? (
                                <p className="mt-2 rounded-lg bg-surface p-4 text-sm text-muted">
                                    {EMPTY[tab]}
                                </p>
                            ) : (
                                <ul>
                                    {visible.map((r) => {
                                        const isNew = newIds.has(r.id);
                                        const busy = busyId === r.id;
                                        const playing = nowPlaying === r.spotify_id;
                                        return (
                                            <li
                                                key={r.id}
                                                className={`border-b border-line py-3 ${isNew ? "-mx-5 bg-accent/10 px-5" : ""
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {r.cover ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                loading="lazy"
                decoding="async"
                                                            src={r.cover}
                                                            alt=""
                                                            width={56}
                                                            height={56}
                                                            className="size-14 shrink-0 rounded-[4px] object-cover"
                                                        />
                                                    ) : (
                                                        <div className="size-14 shrink-0 rounded-[4px] bg-line" />
                                                    )}

                                                    <div className="min-w-0 flex-1">
                                                        <p
                                                            className={`truncate text-base ${playing
                                                                ? "font-bold text-accent"
                                                                : "font-medium text-ink"
                                                                }`}
                                                        >
                                                            {r.name}
                                                        </p>
                                                        <p className="mt-0.5 truncate text-sm text-muted">
                                                            {r.artists}
                                                        </p>
                                                        <div className="mt-1 flex flex-wrap items-center gap-2">
                                                            {playing ? (
                                                                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-accent">
                                                                    <EqBars />
                                                                    Çalıyor
                                                                </span>
                                                            ) : (
                                                                (tab === "all" || isNew) && (
                                                                    <span
                                                                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_BADGE[r.status].className}`}
                                                                    >
                                                                        {STATUS_BADGE[r.status].text}
                                                                    </span>
                                                                )
                                                            )}
                                                            {(r.request_count ?? 1) > 1 && (
                                                                <span
                                                                    title={`${r.request_count} kişi istedi`}
                                                                    className="rounded-full bg-raised px-2 py-0.5 text-xs font-extrabold text-ink"
                                                                >
                                                                    ×{r.request_count} istek
                                                                </span>
                                                            )}
                                                            {isNew && (
                                                                <span className="rounded bg-accent px-1.5 py-px text-xs font-extrabold uppercase text-on-accent">
                                                                    Yeni
                                                                </span>
                                                            )}
                                                            <span className="text-xs text-faint">
                                                                {ago(r.last_requested_at ?? r.created_at, now)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <LyricsButton name={r.name} artists={r.artists} />
                                                </div>

                                                <div className="mt-3 flex gap-2">
                                                    {r.status === "pending" ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => changeStatus(r.id, "approved")}
                                                                className={`${btn} flex-1 bg-accent text-on-accent`}
                                                            >
                                                                <Check size={15} />
                                                                Onayla
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => changeStatus(r.id, "rejected")}
                                                                className={`${btn} flex-1 bg-raised text-danger`}
                                                            >
                                                                <X size={15} />
                                                                Reddet
                                                            </button>
                                                        </>
                                                    ) : r.status === "approved" ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                disabled={busy || system.busy}
                                                                onClick={() =>
                                                                    playing
                                                                        ? stop()
                                                                        : play(
                                                                            r.spotify_id,
                                                                            `${r.name} · ${r.artists}`
                                                                        )
                                                                }
                                                                className={`${btn} flex-1 ${playing
                                                                    ? "bg-danger/20 text-danger"
                                                                    : "bg-accent text-on-accent"
                                                                    }`}
                                                            >
                                                                {playing ? (
                                                                    <Square size={13} fill="currentColor" />
                                                                ) : (
                                                                    <Play size={14} fill="currentColor" />
                                                                )}
                                                                {playing ? "Durdur" : "Çal"}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => changeStatus(r.id, "played")}
                                                                className={`${btn} flex-1 bg-raised text-ink`}
                                                            >
                                                                <CheckCheck size={15} />
                                                                Çalındı
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => changeStatus(r.id, "pending")}
                                                                aria-label="Bekleyene al"
                                                                className={`${iconBtn} bg-raised text-ink`}
                                                            >
                                                                <Undo2 size={15} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => changeStatus(r.id, "pending")}
                                                                className={`${btn} flex-1 bg-raised text-ink`}
                                                            >
                                                                <Undo2 size={15} />
                                                                Bekleyene al
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => remove(r.id)}
                                                                className={`${btn} bg-danger/15 text-danger`}
                                                            >
                                                                <Trash2 size={15} />
                                                                Sil
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </>
                )}
            </div>

            {nowPlaying && (
                <DashPlayer
                    title={system.state?.nowPlayingTitle ?? null}
                    cover={playingCover}
                    busy={system.busy}
                    onStop={stop}
                />
            )}

            {/* Alt menü: sitedekiyle aynı tarz */}
            <nav
                aria-label="Dashboard menüsü"
                className="relative z-30 shrink-0 border-t border-line bg-page/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur"
            >
                <ul className="grid grid-cols-5" role="tablist">
                    {MAIN_TABS.map(({ key, label, Icon }) => {
                        const active = main === key;
                        return (
                            <li key={key}>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => setMain(key)}
                                    className="group flex w-full flex-col items-center gap-1 rounded-lg py-1"
                                >
                                    <span
                                        className={`relative flex h-8 w-14 items-center justify-center rounded-full transition ${active ? "bg-ink" : "group-hover:bg-raised"
                                            }`}
                                    >
                                        <Icon
                                            size={20}
                                            className={active ? "text-page" : "text-muted"}
                                        />
                                        {key === "requests" && newIds.size > 0 && (
                                            <span className="absolute -right-0.5 -top-1 min-w-[18px] rounded-full bg-accent px-1 text-center text-xs font-bold leading-[18px] text-on-accent">
                                                {newIds.size > 9 ? "9+" : newIds.size}
                                            </span>
                                        )}
                                    </span>
                                    <span
                                        className={`text-xs font-bold ${active ? "text-ink" : "text-muted"
                                            }`}
                                    >
                                        {label}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </div>
    );
}

export default function DashboardClient() {
    return (
        <ToastProvider fixed>
            <LyricsProvider>
                <DashboardInner />
            </LyricsProvider>
        </ToastProvider>
    );
}
