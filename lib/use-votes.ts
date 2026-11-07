"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MyVote = -1 | 0 | 1;
export type VoteState = { likes: number; mine: MyVote };
export type VoteMap = Record<string, VoteState>;

// Beğeniler acil değil, dakikada bir bakması yeter
const POLL_MS = 60_000;

export function useVotes() {
    const [votes, setVotes] = useState<VoteMap>({});
    const [error, setError] = useState<string | null>(null);
    const votesRef = useRef<VoteMap>({});
    const inFlight = useRef(0);

    useEffect(() => {
        votesRef.current = votes;
    });

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/votes", { cache: "no-store" });
            const data: unknown = await res.json();
            if (
                !res.ok ||
                typeof data !== "object" ||
                data === null ||
                Array.isArray(data)
            ) {
                throw new Error();
            }
            // Bir oy gönderilirken gelen eski veri ekrandaki oyu ezmesin
            if (inFlight.current > 0) return;
            setVotes(data as VoteMap);
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

    // Aynı butona tekrar basınca oy geri çekilir
    const vote = useCallback(async (id: string, value: 1 | -1) => {
        const current: VoteState = votesRef.current[id] ?? { likes: 0, mine: 0 };
        const next: MyVote = current.mine === value ? 0 : value;
        const likes = Math.max(
            0,
            current.likes - (current.mine === 1 ? 1 : 0) + (next === 1 ? 1 : 0)
        );

        setError(null);
        inFlight.current++;
        setVotes((m) => ({ ...m, [id]: { likes, mine: next } }));

        try {
            const res = await fetch("/api/votes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, value: next }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error ?? "");
            }
        } catch (e) {
            setVotes((m) => ({ ...m, [id]: current }));
            setError((e as Error).message || "Oy gönderilemedi. Tekrar dene.");
        } finally {
            inFlight.current--;
        }
    }, []);

    return { votes, vote, error };
}