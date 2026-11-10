"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { useLive } from "@/lib/live-client";
import { fetchFirst, startEarly } from "@/lib/early-fetch";

type Raw = {
    requestsOpen: boolean;
    votingOpen: boolean;
    nowPlaying: string | null;
    nowPlayingTitle: string | null;
    played: string[];
    playlistVisible?: boolean;
    nowPlayingCover?: string | null;
};

// Sunucunun sayfaya gömdüğü anahtarlar (lib/app-flags)
export type InitialFlags = {
    requestsOpen: boolean;
    votingOpen: boolean;
    playlistVisible: boolean;
};

export type System = {
    nowPlayingCover: string | null;
    loaded: boolean;
    requestsOpen: boolean;
    votingOpen: boolean;
    nowPlaying: string | null;
    nowPlayingTitle: string | null;
    played: Set<string>;
    playlistVisible: boolean;
};

// Canlı bağlantı varken sadece yedek olarak, yoksa eskisi gibi sık bakar
const POLL_MS = 60_000;
const FALLBACK_POLL_MS = 5_000;
const STATE_URL = "/api/state";

startEarly(STATE_URL);

const EMPTY: System = {
    loaded: false,
    playlistVisible: true,
    requestsOpen: false,
    votingOpen: false,
    nowPlaying: null,
    nowPlayingTitle: null,
    played: new Set(),
    nowPlayingCover: null,
};

const SystemContext = createContext<System>(EMPTY);

export function SystemProvider({
    initial,
    children,
}: {
    initial: InitialFlags | null;
    children: ReactNode;
}) {
    // Anahtarlar sayfayla birlikte gelir: istek butonu ve playlist ilk anda doğru görünür.
    // Çalan şarkı ve çalınanlar ilk /api/state cevabıyla gelir.
    const [raw, setRaw] = useState<Raw | null>(() =>
        initial
            ? { ...initial, nowPlaying: null, nowPlayingTitle: null, played: [] }
            : null
    );

    // v: canlı sinyalin sürümü. Herkes aynı adresi ister, Vercel CDN'den tek cevapla döner
    const load = useCallback(async (v?: number) => {
        try {
            const res = await (v ? fetch(`${STATE_URL}?v=${v}`) : fetchFirst(STATE_URL));
            const data: unknown = await res.json();
            if (!res.ok || typeof data !== "object" || data === null) {
                throw new Error();
            }
            setRaw(data as Raw);
        } catch {
            // Sessiz geç, bir sonraki turda tekrar dener
        }
    }, []);

    const live = useLive("state", (v) => load(v));

    useEffect(() => {
        const first = setTimeout(() => load(), 0);
        const onVisible = () => {
            if (!document.hidden) load();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            clearTimeout(first);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [load]);

    // Yedek yoklama: canlı bağlantı varken dakikada bir, yokken 5 sn'de bir
    useEffect(() => {
        const timer = setInterval(() => {
            if (!document.hidden) load();
        }, live ? POLL_MS : FALLBACK_POLL_MS);
        return () => clearInterval(timer);
    }, [load, live]);

    const value = useMemo<System>(
        () =>
            raw
                ? {
                    loaded: true,
                    playlistVisible: raw.playlistVisible !== false,
                    requestsOpen: raw.requestsOpen,
                    votingOpen: raw.votingOpen,
                    nowPlaying: raw.nowPlaying,
                    nowPlayingTitle: raw.nowPlayingTitle ?? null,
                    nowPlayingCover: raw.nowPlayingCover ?? null,
                    played: new Set(raw.played ?? []),
                }
                : EMPTY,
        [raw]
    );

    return (
        <SystemContext.Provider value={value}>{children}</SystemContext.Provider>
    );
}

export const useSystem = () => useContext(SystemContext);
