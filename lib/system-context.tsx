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

type Raw = {
    requestsOpen: boolean;
    votingOpen: boolean;
    nowPlaying: string | null;
    nowPlayingTitle: string | null;
    played: string[];
    playlistVisible?: boolean;
    nowPlayingCover?: string | null;
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

export function SystemProvider({ children }: { children: ReactNode }) {
    const [raw, setRaw] = useState<Raw | null>(null);

    const load = useCallback(async (fresh = false) => {
        try {
            // fresh: sinyal gelince ortak (CDN) önbelleği atla
            const url = fresh ? `/api/state?t=${Date.now()}` : "/api/state";
            const res = await fetch(url, { cache: "no-store" });
            const data: unknown = await res.json();
            if (!res.ok || typeof data !== "object" || data === null) {
                throw new Error();
            }
            setRaw(data as Raw);
        } catch {
            // Sessiz geç, bir sonraki turda tekrar dener
        }
    }, []);

    const live = useLive("state", () => load(true));

    useEffect(() => {
        const first = setTimeout(() => load(), 0);
        const timer = setInterval(() => {
            if (!document.hidden) load();
        }, live ? POLL_MS : FALLBACK_POLL_MS);
        const onVisible = () => {
            if (!document.hidden) load();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            clearTimeout(first);
            clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
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