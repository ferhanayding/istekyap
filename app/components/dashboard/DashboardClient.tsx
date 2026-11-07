"use client";

import { useRouter } from "next/navigation";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    Check,
    CheckCheck,
    ListMusic,
    LogOut,
    MessageSquareText,
    Mic,
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
import EqBars from "../EqBars";
import { ToastProvider, useToast } from "../Toast";
import LoadingTracks from "../LoadingTracks";
import CommentsPanel from "./CommentsPanel";
import LyricsBar from "./LyricsBar";
import { LyricsProvider, useLyrics } from "../LyricsSheet";
import SongStats from "./SongStats";
import SystemPanel from "./SystemPanel";

type Status = "pending" | "approved" | "played" | "rejected";
type Main = "requests" | "playlist" | "comments" | "system";
type Tab = Status | "all";

const STATUS_ORDER: Record<Status, number> = {
    pending: 0,
    approved: 1,
    played: 2,
    rejected: 3,
};

const STATUS_BADGE: Record<Status, { text: string; className: string }> = {
    pending: { text: "Bekliyor", className: "bg-white/[0.09] text-[#B3B3B3]" },
    approved: { text: "Onaylı", className: "bg-[#1ED760]/15 text-[#1ED760]" },
    played: { text: "Çalındı", className: "bg-[#9B80FF]/20 text-[#C3B3FF]" },
    rejected: { text: "Reddedildi", className: "bg-[#FF729B]/15 text-[#FF8FB0]" },
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

const POLL_MS = 10_000;
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
    "flex size-9 items-center justify-center rounded-full bg-white/[0.08] text-[#CFC4FF] transition hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9B80FF]";

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
    const openLyrics = useLyrics();

    return (
        <div className="relative mx-2 mb-1.5 shrink-0 rounded-lg bg-gradient-to-r from-[#3A2B8F] to-[#2A2060] shadow-[0_-10px_30px_-12px_#000]">
            <div className="flex items-center gap-3 p-2">
                {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={cover}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 shrink-0 rounded-[4px] object-cover"
                    />
                ) : (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[4px] bg-white/10">
                        <Music2 size={18} />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{name}</p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-white/65">
                        <EqBars className="shrink-0" />
                        <span className="shrink-0 font-bold text-[#1ED760]">Çalıyor</span>
                        {artists && <span className="truncate">· {artists}</span>}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => openLyrics({ name, artists })}
                    aria-label={`${name} sözlerini aç`}
                    title="Sözler"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                >
                    <Mic size={15} />
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={onStop}
                    aria-label="Durdur"
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-extrabold text-black transition active:scale-95 disabled:opacity-50"
                >
                    <Square size={12} fill="currentColor" />
                    Durdur
                </button>
            </div>
        </div>
    );
}

function DashboardInner() {
    const openLyrics = useLyrics();
    const [items, setItems] = useState<RequestRow[] | null>(null);
    const [main, setMain] = useState<Main>("requests");
    const [tab, setTab] = useState<Tab>("all");
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

    // Dashboard arka plandayken de yenilenir, yeni istek sekme başlığına yazılır
    useEffect(() => {
        const first = setTimeout(() => load(), 0);
        const timer = setInterval(() => load(), POLL_MS);
        return () => {
            clearTimeout(first);
            clearInterval(timer);
        };
    }, [load]);

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
            {/* Spotify tarzı üst renk geçişi */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-[#4A38B0]/55 via-[#2A1F66]/25 to-transparent" />

            <header className="relative shrink-0 px-5 pb-2 pt-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-baseline gap-2">
                        <h1 className="text-[26px] font-extrabold leading-none tracking-[-1.2px]">
                            Dash<span className="text-[#B9A6FF]">board</span>
                        </h1>
                        <span className="truncate text-[10px] font-bold uppercase tracking-[2.5px] text-white/45">
                            LƏYSAN
                        </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={toggleSound}
                            aria-label={sound ? "Bildirim sesini kapat" : "Bildirim sesini aç"}
                            aria-pressed={sound}
                            className={`flex size-9 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9B80FF] ${sound
                                ? "bg-[#1ED760]/20 text-[#1ED760]"
                                : "bg-white/[0.08] text-[#CFC4FF] hover:bg-white/[0.14]"
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

                <p className="mt-1 text-[11px] leading-snug text-white/55">
                    {items ? `${count("pending")} bekleyen istek` : "…"} ·{" "}
                    {POLL_MS / 1000} saniyede bir güncellenir
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
                            <div className="mb-2 flex shrink-0 items-center justify-between gap-3 rounded-lg bg-[#7555E9]/25 px-4 py-2.5 text-sm font-bold">
                                <span>{newIds.size} yeni istek geldi</span>
                                <button
                                    type="button"
                                    onClick={() => setNewIds(new Set())}
                                    className="text-xs font-bold text-[#C3B3FF] hover:text-white"
                                >
                                    Hepsini gördüm
                                </button>
                            </div>
                        )}

                        <div
                            className="mb-1 flex shrink-0 gap-2 overflow-x-auto pb-2 [scrollbar-color:#3A3270_transparent] [scrollbar-width:thin]"
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
                                        ? "bg-[#1ED760] text-black"
                                        : "bg-white/[0.09] text-white hover:bg-white/[0.14]"
                                        }`}
                                >
                                    {t.label} <span className="opacity-70">{count(t.key)}</span>
                                </button>
                            ))}
                        </div>

                        <div className="-mx-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 [scrollbar-color:#3A3270_transparent] [scrollbar-width:thin]">
                            {items === null ? (
                                <LoadingTracks />
                            ) : visible.length === 0 ? (
                                <p className="mt-2 rounded-lg bg-white/[0.05] p-4 text-sm text-[#B3B3B3]">
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
                                                className={`border-b border-white/[0.05] py-3 ${isNew ? "-mx-5 bg-[#9B80FF]/[0.08] px-5" : ""
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {r.cover ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={r.cover}
                                                            alt=""
                                                            width={56}
                                                            height={56}
                                                            className="size-14 shrink-0 rounded-[4px] object-cover"
                                                        />
                                                    ) : (
                                                        <div className="size-14 shrink-0 rounded-[4px] bg-white/10" />
                                                    )}

                                                    <div className="min-w-0 flex-1">
                                                        <p
                                                            className={`truncate text-base ${playing
                                                                ? "font-bold text-[#1ED760]"
                                                                : "font-medium text-white"
                                                                }`}
                                                        >
                                                            {r.name}
                                                        </p>
                                                        <p className="mt-0.5 truncate text-sm text-[#B3B3B3]">
                                                            {r.artists}
                                                        </p>
                                                        <div className="mt-1 flex flex-wrap items-center gap-2">
                                                            {playing ? (
                                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#1ED760]">
                                                                    <EqBars />
                                                                    Çalıyor
                                                                </span>
                                                            ) : (
                                                                (tab === "all" || isNew) && (
                                                                    <span
                                                                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[r.status].className}`}
                                                                    >
                                                                        {STATUS_BADGE[r.status].text}
                                                                    </span>
                                                                )
                                                            )}
                                                            {(r.request_count ?? 1) > 1 && (
                                                                <span
                                                                    title={`${r.request_count} kişi istedi`}
                                                                    className="rounded-full bg-[#9B80FF]/20 px-2 py-0.5 text-[10px] font-extrabold text-[#CFC4FF]"
                                                                >
                                                                    ×{r.request_count} istek
                                                                </span>
                                                            )}
                                                            {isNew && (
                                                                <span className="rounded bg-[#9B80FF] px-1.5 py-px text-[10px] font-extrabold uppercase text-white">
                                                                    Yeni
                                                                </span>
                                                            )}
                                                            <span className="text-[11px] text-[#7C7794]">
                                                                {ago(r.last_requested_at ?? r.created_at, now)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openLyrics({ name: r.name, artists: r.artists })
                                                        }
                                                        aria-label={`${r.name} sözlerini aç`}
                                                        title="Sözler"
                                                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#B3B3B3] transition hover:bg-white/10 hover:text-white"
                                                    >
                                                        <Mic size={16} />
                                                    </button>
                                                </div>

                                                <div className="mt-3 flex gap-2">
                                                    {r.status === "pending" ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => changeStatus(r.id, "approved")}
                                                                className={`${btn} flex-1 bg-[#1ED760] text-black`}
                                                            >
                                                                <Check size={15} />
                                                                Onayla
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => changeStatus(r.id, "rejected")}
                                                                className={`${btn} flex-1 bg-white/[0.09] text-[#FF8FB0]`}
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
                                                                    ? "bg-[#FF729B]/20 text-[#FF8FB0]"
                                                                    : "bg-[#1ED760] text-black"
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
                                                                className={`${btn} flex-1 bg-[#7555E9]/35 text-white`}
                                                            >
                                                                <CheckCheck size={15} />
                                                                Çalındı
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => changeStatus(r.id, "pending")}
                                                                aria-label="Bekleyene al"
                                                                className={`${iconBtn} bg-white/[0.09] text-[#D0CAE8]`}
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
                                                                className={`${btn} flex-1 bg-white/[0.09] text-white`}
                                                            >
                                                                <Undo2 size={15} />
                                                                Bekleyene al
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => remove(r.id)}
                                                                className={`${btn} bg-[#FF729B]/15 text-[#FF8FB0]`}
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
                className="relative z-30 shrink-0 border-t border-white/[0.06] bg-[#0E0C1A]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur"
            >
                <ul className="grid grid-cols-4" role="tablist">
                    {MAIN_TABS.map(({ key, label, Icon }) => {
                        const active = main === key;
                        return (
                            <li key={key}>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => setMain(key)}
                                    className="group flex w-full flex-col items-center gap-1 py-1 outline-none"
                                >
                                    <span
                                        className={`relative flex h-8 w-14 items-center justify-center rounded-full transition ${active ? "bg-[#7555E9]" : "group-hover:bg-white/[0.06]"
                                            }`}
                                    >
                                        <Icon
                                            size={20}
                                            className={active ? "text-white" : "text-[#9A94B0]"}
                                        />
                                        {key === "requests" && newIds.size > 0 && (
                                            <span className="absolute -right-0.5 -top-1 min-w-[18px] rounded-full bg-[#FF729B] px-1 text-center text-[10px] font-bold leading-[18px] text-white">
                                                {newIds.size > 9 ? "9+" : newIds.size}
                                            </span>
                                        )}
                                    </span>
                                    <span
                                        className={`text-[11px] font-bold ${active ? "text-white" : "text-[#9A94B0]"
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
