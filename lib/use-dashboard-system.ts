"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export type SystemState = {
    playlistVisible: boolean;
    requestsOpen: boolean;
    votingOpen: boolean;
    nowPlaying: string | null;
    nowPlayingTitle: string | null;
    nowPlayingCover?: string | null;
    played: string[];
};

export type SystemAction =
    | {
        action: "set";
        key: "requests_open" | "voting_open" | "playlist_visible";
        value: boolean;
    }
    | { action: "play"; id: string; title?: string }
    | { action: "stop" }
    | { action: "reset_played" }
    | { action: "reset_votes" }
    | { action: "reset_requests" };


const POLL_MS = 10_000;
export function useDashboardSystem() {
    const [state, setState] = useState<SystemState | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/dashboard/system", { cache: "no-store" });
            if (res.status === 401) {
                router.replace("/login");
                return;
            }
            const data: unknown = await res.json();
            if (!res.ok || typeof data !== "object" || data === null) {
                throw new Error();
            }
            setState(data as SystemState);
        } catch {
            // Sessiz geç, bir sonraki turda tekrar dener
        }
    }, [router]);

    useEffect(() => {
        const first = setTimeout(() => load(), 0);
        const timer = setInterval(() => load(), POLL_MS);
        return () => {
            clearTimeout(first);
            clearInterval(timer);
        };
    }, [load]);

    const act = useCallback(async (body: SystemAction): Promise<boolean> => {
        setBusy(true);
        setError(null);
        try {
            const res = await fetch("/api/dashboard/system", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (res.status === 401) {
                router.replace("/login");
                return false;
            }
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setError(data?.error ?? "İşlem yapılamadı.");
                return false;
            }
            setState(data as SystemState);
            return true;
        } catch {
            setError("İşlem yapılamadı.");
            return false;
        } finally {
            setBusy(false);
        }
    }, [router]);

    return { state, busy, error, load, act };
}

export type DashboardSystem = ReturnType<typeof useDashboardSystem>;
