"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLive } from "@/lib/live-client";
import { fetchFirst, startEarly } from "@/lib/early-fetch";

export type RequestStatus = "pending" | "approved" | "played" | "rejected";

export type RequestItem = {
    id: string;
    spotify_id: string;
    name: string;
    artists: string;
    cover: string | null;
    status: RequestStatus;
    request_count?: number;
    created_at: string;
    last_requested_at?: string;
};

export const REQUEST_SENT_EVENT = "istek:gonderildi";
// Canlı bağlantı varken sadece yedek olarak, yoksa eskisi gibi sık bakar
export const POLL_MS = 60_000;
const FALLBACK_POLL_MS = 10_000;
const REQUESTS_URL = "/api/requests";

startEarly(REQUESTS_URL);

export function useRequestFeed(onNew: (fresh: RequestItem[]) => void) {
    const [items, setItems] = useState<RequestItem[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [now, setNow] = useState(0);
    const known = useRef<Set<string> | null>(null);
    const onNewRef = useRef(onNew);

    useEffect(() => {
        onNewRef.current = onNew;
    });

    const load = useCallback(
        async (opts: { silent?: boolean; fresh?: boolean; v?: number } = {}) => {
            try {
                // v: canlı sinyalin sürümü, herkes aynı adresi ister (CDN tek cevap verir).
                // fresh: kendi isteğimizden hemen sonra ortak önbelleği atla.
                const res = await (opts.v
                    ? fetch(`${REQUESTS_URL}?v=${opts.v}`)
                    : opts.fresh
                        ? fetch(`${REQUESTS_URL}?t=${Date.now()}`, { cache: "no-store" })
                        : fetchFirst(REQUESTS_URL));
                const data: unknown = await res.json();
                if (!res.ok || !Array.isArray(data)) throw new Error();

                const list = data as RequestItem[];
                const prev = known.current;
                // Bildirim sadece daha önce görmediğimiz yeni bekleyen istekler için
                const fresh = prev
                    ? list.filter((r) => r.status === "pending" && !prev.has(r.id))
                    : [];
                known.current = new Set([...(prev ?? []), ...list.map((r) => r.id)]);

                setItems(list);
                setNow(Date.now());
                setFailed(false);
                if (fresh.length > 0 && !opts.silent) onNewRef.current(fresh);
            } catch {
                setFailed(true);
            }
        },
        []
    );

    // Biri istek atınca ya da dashboard'dan değişiklik olunca hemen tazele
    const live = useLive("requests", (v) => load({ v }));

    useEffect(() => {
        const first = setTimeout(() => load(), 0);
        // Sekme arka plandayken yenileme, geri dönünce hemen yenile
        const onVisible = () => {
            if (!document.hidden) load();
        };
        const onSent = () => load({ silent: true, fresh: true });

        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener(REQUEST_SENT_EVENT, onSent);
        return () => {
            clearTimeout(first);
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener(REQUEST_SENT_EVENT, onSent);
        };
    }, [load]);

    // Yedek yoklama: canlı bağlantı varken dakikada bir, yokken 10 sn'de bir
    useEffect(() => {
        const timer = setInterval(() => {
            if (!document.hidden) load();
        }, live ? POLL_MS : FALLBACK_POLL_MS);
        return () => clearInterval(timer);
    }, [load, live]);

    return { items, failed, now, live };
}

export type RequestFeed = ReturnType<typeof useRequestFeed>;