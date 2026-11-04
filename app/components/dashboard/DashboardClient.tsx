"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Check,
    CheckCheck,
    ExternalLink,
    LogOut,
    Play,
    RefreshCw,
    Square,
    Trash2,
    Undo2,
    Volume2,
    VolumeX,
    X,
} from "lucide-react";
import { logout } from "@/app/login/actions";
import { useDashboardSystem } from "@/lib/use-dashboard-system";
import NowPlayingBadge from "../NowPlayingBadge";
import { ToastProvider, useToast } from "../Toast";
import LoadingTracks from "../LoadingTracks";
import LyricsBar from "./LyricsBar";
import SongStats from "./SongStats";
import SystemPanel from "./SystemPanel";

type Status = "pending" | "approved" | "played" | "rejected";
type Main = "requests" | "playlist" | "system";

type RequestRow = {
    id: string;
    spotify_id: string;
    name: string;
    artists: string;
    cover: string | null;
    status: Status;
    created_at: string;
};

const POLL_MS = 20_000;

const TABS: { key: Status; label: string }[] = [
    { key: "pending", label: "Bekleyen" },
    { key: "approved", label: "Onaylı" },
    { key: "played", label: "Çalındı" },
    { key: "rejected", label: "Reddedilen" },
];

const MAIN_TABS: { key: Main; label: string }[] = [
    { key: "requests", label: "İstekler" },
    { key: "playlist", label: "Playlist" },
    { key: "system", label: "Sistem" },
];

const EMPTY: Record<Status, string> = {
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
    "flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold transition active:scale-95 disabled:opacity-50";
const iconBtn =
    "flex size-10 shrink-0 items-center justify-center rounded-xl transition active:scale-95 disabled:opacity-50";

function DashboardInner() {
    const [items, setItems] = useState<RequestRow[] | null>(null);
    const [main, setMain] = useState<Main>("requests");
    const [tab, setTab] = useState<Status>("pending");
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
    const listRef = useRef<HTMLDivElement>(null);

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
        if (await system.act({ action: "play", id, title })) void load();
    }

    async function stop() {
        if (await system.act({ action: "stop" })) void load();
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
                window.location.assign("/login");
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

    const count = (s: Status) => items?.filter((r) => r.status === s).length ?? 0;
    const visible = items?.filter((r) => r.status === tab) ?? [];

    return (
        <div className="mx-auto flex h-dvh max-w-2xl flex-col px-5 pt-8">
            <header className="mb-4 flex shrink-0 items-start justify-between gap-3">
                <div>
                    <h1 className="text-[32px] font-extrabold leading-none tracking-[-1.5px]">
                        Dashboard
                    </h1>
                    <p className="mt-2 text-sm text-[#928BA8]">
                        {items ? `${count("pending")} bekleyen istek` : "…"} ·{" "}
                        {POLL_MS / 1000} saniyede bir güncellenir
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={toggleSound}
                        aria-label={sound ? "Bildirim sesini kapat" : "Bildirim sesini aç"}
                        aria-pressed={sound}
                        className={`flex size-11 items-center justify-center rounded-2xl border transition ${sound
                            ? "border-[#9B80FF]/40 bg-[#8C70FF]/20 text-[#B9A6FF]"
                            : "border-white/[0.06] bg-white/[0.04] text-[#A99EC9]"
                            }`}
                    >
                        {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
                    </button>
                    <button
                        type="button"
                        onClick={refresh}
                        aria-label="Yenile"
                        className="flex size-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.04] text-[#A99EC9] transition hover:bg-white/[0.08]"
                    >
                        <RefreshCw size={19} className={refreshing ? "animate-spin" : ""} />
                    </button>
                    <form action={logout}>
                        <button
                            aria-label="Çıkış yap"
                            className="flex size-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.04] text-[#A99EC9] transition hover:bg-white/[0.08]"
                        >
                            <LogOut size={19} />
                        </button>
                    </form>
                </div>
            </header>

            {/* Şarkı sözü araması: her sekmede sabit */}
            <LyricsBar />

            {/* Ana sekmeler */}
            <div
                className="mb-3 grid shrink-0 grid-cols-3 rounded-2xl bg-white/[0.04] p-1"
                role="tablist"
            >
                {MAIN_TABS.map((m) => (
                    <button
                        key={m.key}
                        type="button"
                        role="tab"
                        aria-selected={main === m.key}
                        onClick={() => setMain(m.key)}
                        className={`rounded-xl py-2.5 text-sm font-bold transition ${main === m.key
                            ? "bg-[#7555E9] text-white"
                            : "text-[#A99EC9] hover:text-white"
                            }`}
                    >
                        {m.label}
                        {m.key === "requests" && newIds.size > 0 && (
                            <span className="ml-1.5 rounded-full bg-[#FF729B] px-1.5 py-0.5 text-[10px] text-white">
                                {newIds.size}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {main === "system" ? (
                <SystemPanel system={system} onChanged={() => void load()} />
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
                        <div className="mb-4 flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-[#9B80FF]/40 bg-[#2A2255]/80 px-4 py-3 text-sm font-bold">
                            <span>{newIds.size} yeni istek geldi</span>
                            <button
                                type="button"
                                onClick={() => setNewIds(new Set())}
                                className="text-xs font-bold text-[#B9A6FF] hover:text-white"
                            >
                                Hepsini gördüm
                            </button>
                        </div>
                    )}

                    <div
                        className="mb-2 flex shrink-0 gap-2 overflow-x-auto pb-2 [scrollbar-color:#3A3270_transparent] [scrollbar-width:thin]"
                        role="tablist"
                    >
                        {TABS.map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                role="tab"
                                aria-selected={tab === t.key}
                                onClick={() => setTab(t.key)}
                                className={`shrink-0 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${tab === t.key
                                    ? "bg-[#7555E9] text-white"
                                    : "bg-white/[0.05] text-[#A99EC9] hover:bg-white/[0.08]"
                                    }`}
                            >
                                {t.label} <span className="opacity-70">{count(t.key)}</span>
                            </button>
                        ))}
                    </div>

                    <div
                        ref={listRef}
                        className="-mx-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-10 [scrollbar-color:#3A3270_transparent] [scrollbar-width:thin]"
                    >
                        {items === null ? (
                            <LoadingTracks />
                        ) : visible.length === 0 ? (
                            <p className="rounded-2xl bg-[#19162D] p-4 text-sm text-[#89839F]">
                                {EMPTY[tab]}
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {visible.map((r) => {
                                    const isNew = newIds.has(r.id);
                                    const busy = busyId === r.id;
                                    const playing = nowPlaying === r.spotify_id;
                                    return (
                                        <li
                                            key={r.id}
                                            className={`rounded-2xl border p-3 ${playing
                                                ? "border-[#37D9BD]/50 bg-gradient-to-r from-[#17342F] to-[#19162D] shadow-[0_0_24px_-8px_#37D9BD]"
                                                : isNew
                                                    ? "border-[#9B80FF]/60 bg-[#19162D]"
                                                    : "border-white/[0.04] bg-[#19162D]"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {r.cover ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={r.cover}
                                                        alt=""
                                                        width={52}
                                                        height={52}
                                                        className="size-[52px] shrink-0 rounded-xl object-cover"
                                                    />
                                                ) : (
                                                    <div className="size-[52px] shrink-0 rounded-xl bg-white/10" />
                                                )}

                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[15px] font-bold text-[#F5F2FF]">
                                                        {r.name}
                                                    </p>
                                                    <p className="mt-0.5 truncate text-xs text-[#89839F]">
                                                        {r.artists}
                                                    </p>
                                                    {playing && <NowPlayingBadge className="mt-1" />}
                                                    <p className="mt-0.5 text-[11px] text-[#817A98]">
                                                        {isNew && (
                                                            <span className="mr-1.5 rounded-full bg-[#9B80FF] px-1.5 py-0.5 text-[10px] font-bold text-white">
                                                                Yeni
                                                            </span>
                                                        )}
                                                        {ago(r.created_at, now)}
                                                    </p>
                                                </div>

                                                <a
                                                    href={`https://open.spotify.com/track/${r.spotify_id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    aria-label="Spotify'da aç"
                                                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-[#AAA2C6] transition hover:bg-white/10"
                                                >
                                                    <ExternalLink size={16} />
                                                </a>
                                            </div>

                                            <div className="mt-3 flex gap-2">
                                                {r.status === "pending" ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => changeStatus(r.id, "approved")}
                                                            className={`${btn} flex-1 bg-[#37D9BD]/15 text-[#37D9BD]`}
                                                        >
                                                            <Check size={16} />
                                                            Onayla
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => changeStatus(r.id, "rejected")}
                                                            className={`${btn} flex-1 bg-[#FF729B]/15 text-[#FF729B]`}
                                                        >
                                                            <X size={16} />
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
                                                                ? "bg-[#FF729B]/15 text-[#FF729B]"
                                                                : "bg-[#37D9BD]/15 text-[#37D9BD]"
                                                                }`}
                                                        >
                                                            {playing ? (
                                                                <Square size={14} fill="currentColor" />
                                                            ) : (
                                                                <Play size={15} fill="currentColor" />
                                                            )}
                                                            {playing ? "Durdur" : "Çal"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => changeStatus(r.id, "played")}
                                                            className={`${btn} flex-1 bg-[#9B80FF]/20 text-[#B9A6FF]`}
                                                        >
                                                            <CheckCheck size={16} />
                                                            Çalındı
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => changeStatus(r.id, "pending")}
                                                            aria-label="Bekleyene al"
                                                            className={`${iconBtn} bg-white/[0.06] text-[#C9C2E4]`}
                                                        >
                                                            <Undo2 size={16} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => changeStatus(r.id, "pending")}
                                                            className={`${btn} flex-1 bg-white/[0.06] text-[#C9C2E4]`}
                                                        >
                                                            <Undo2 size={16} />
                                                            Bekleyene al
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => remove(r.id)}
                                                            className={`${btn} bg-[#FF729B]/15 text-[#FF729B]`}
                                                        >
                                                            <Trash2 size={16} />
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
    );
}

export default function DashboardClient() {
    return (
        <ToastProvider fixed>
            <DashboardInner />
        </ToastProvider>
    );
}