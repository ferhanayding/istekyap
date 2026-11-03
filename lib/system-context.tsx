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

type Raw = {
    requestsOpen: boolean;
    votingOpen: boolean;
    nowPlaying: string | null;
    nowPlayingTitle: string | null;
    played: string[];
};

export type System = {
    loaded: boolean;
    requestsOpen: boolean;
    votingOpen: boolean;
    nowPlaying: string | null;
    nowPlayingTitle: string | null;
    played: Set<string>;
};

const POLL_MS = 10_000;

const EMPTY: System = {
    loaded: false,
    requestsOpen: false,
    votingOpen: false,
    nowPlaying: null,
    nowPlayingTitle: null,
    played: new Set(),
};

const SystemContext = createContext<System>(EMPTY);

export function SystemProvider({ children }: { children: ReactNode }) {
    const [raw, setRaw] = useState<Raw | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/state", { cache: "no-store" });
            const data: unknown = await res.json();
            if (!res.ok || typeof data !== "object" || data === null) {
                throw new Error();
            }
            setRaw(data as Raw);
        } catch {
            // Sessiz geç, bir sonraki turda tekrar dener
        }
    }, []);

    useEffect(() => {
        const first = setTimeout(() => load(), 0);
        const timer = setInterval(() => {
            if (!document.hidden) load();
        }, POLL_MS);
        const onVisible = () => {
            if (!document.hidden) load();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            clearTimeout(first);
            clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [load]);

    const value = useMemo<System>(
        () =>
            raw
                ? {
                    loaded: true,
                    requestsOpen: raw.requestsOpen,
                    votingOpen: raw.votingOpen,
                    nowPlaying: raw.nowPlaying,
                    nowPlayingTitle: raw.nowPlayingTitle ?? null,
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