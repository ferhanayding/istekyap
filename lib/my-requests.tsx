"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { useLive } from "@/lib/live-client";
import { REQUEST_DONE_EVENT } from "@/lib/send-request";
import type { RequestItem } from "@/lib/use-request-feed";
import type { MineResponse } from "@/lib/visitor-types";
import { useToast } from "../app/components/Toast";
import { useT } from "@/lib/i18n";

// Ziyaretçinin kendi istekleri ve "sonraki isteğe kalan süre".
// Kaynak sunucu (/api/requests/mine): çerezdeki cihaz kimliğine göre, sayfa yenilense de doğru kalır.

type Mine = {
    /** Bu gece istediğim (ya da katıldığım) şarkılar */
    ids: Set<string>;
    /** Yeni istek hakkının açılacağı an (ms). 0: hemen isteyebilirim */
    waitUntil: number;
    /** Şu an beklemem gerekiyor mu */
    waiting: boolean;
};

const EMPTY: Mine = { ids: new Set(), waitUntil: 0, waiting: false };
const MineContext = createContext<Mine>(EMPTY);

export function MineProvider({ children }: { children: ReactNode }) {
    const [data, setData] = useState<{ ids: Set<string>; waitUntil: number }>({
        ids: new Set(),
        waitUntil: 0,
    });

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/requests/mine", { cache: "no-store" });
            const d = (await res.json()) as Partial<MineResponse> | null;
            if (!res.ok || !d || !Array.isArray(d.ids)) return;
            const waitSec = typeof d.waitSec === "number" ? d.waitSec : 0;
            setData({
                ids: new Set(d.ids),
                waitUntil: waitSec > 0 ? Date.now() + waitSec * 1000 : 0,
            });
        } catch {
            // Sessiz geç: etiket ve sayaç olmadan da site çalışır
        }
    }, []);

    useEffect(() => {
        const first = setTimeout(() => void load(), 0);
        // Her istek denemesinden sonra (başarılı ya da sınıra takılmış) tazele
        const onDone = () => void load();
        const onVisible = () => {
            if (!document.hidden) void load();
        };
        window.addEventListener(REQUEST_DONE_EVENT, onDone);
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            clearTimeout(first);
            window.removeEventListener(REQUEST_DONE_EVENT, onDone);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [load]);

    // Gece başlayınca / bitince istekler arşive gider: "benim isteklerim" de sıfırlanır
    useLive("state", () => void load());

    // Süre dolunca sunucuya bir kez daha sor: hak gerçekten açıldıysa sayaç kalkar
    useEffect(() => {
        if (!data.waitUntil) return;
        const t = setTimeout(
            () => void load(),
            Math.max(0, data.waitUntil - Date.now()) + 500
        );
        return () => clearTimeout(t);
    }, [data.waitUntil, load]);

    const value = useMemo<Mine>(
        () => ({ ids: data.ids, waitUntil: data.waitUntil, waiting: data.waitUntil > 0 }),
        [data]
    );
    return <MineContext.Provider value={value}>{children}</MineContext.Provider>;
}

export const useMine = () => useContext(MineContext);

// Kalan saniye, saniyede bir güncellenir (0: süre doldu ya da bekleme yok)
export function useSecondsLeft(until: number): number {
    const [left, setLeft] = useState(0);
    useEffect(() => {
        const tick = () => setLeft(until ? Math.max(0, Math.ceil((until - Date.now()) / 1000)) : 0);
        const first = setTimeout(tick, 0);
        const timer = until ? setInterval(tick, 1000) : undefined;
        return () => {
            clearTimeout(first);
            if (timer) clearInterval(timer);
        };
    }, [until]);
    return left;
}

// 272 → "4:32"
export function formatWait(sec: number): string {
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

// Kendi isteğimin durumu değişince haber ver: onaylandı, çalıyor, çalınamıyor
export function useMyRequestAlerts(items: RequestItem[] | null, nowPlaying: string | null) {
    const { ids } = useMine();
    const toast = useToast();
    const t = useT();
    // şarkı → son bilinen durum ("playing": şu an çalıyor)
    const prev = useRef<Map<string, string> | null>(null);

    useEffect(() => {
        if (!items) return;
        const cur = new Map<string, { state: string; name: string }>();
        for (const r of items) {
            if (!ids.has(r.spotify_id)) continue;
            cur.set(r.spotify_id, {
                state: nowPlaying === r.spotify_id ? "playing" : r.status,
                name: r.name,
            });
        }
        const before = prev.current;
        prev.current = new Map([...cur].map(([id, v]) => [id, v.state]));
        if (!before) return;

        for (const [id, { state, name }] of cur) {
            const old = before.get(id);
            // Yeni attığım istek (önceki durumu yok) için bildirim gerekmez
            if (!old || old === state) continue;
            if (state === "playing") {
                toast.show(t("İsteğin şimdi çalıyor: {name}", { name }), { tone: "success", duration: 7000 });
            } else if (state === "approved" && old === "pending") {
                toast.show(t("İsteğin onaylandı, çalınacak: {name}", { name }), {
                    tone: "success",
                    duration: 6000,
                });
            } else if (state === "rejected") {
                toast.show(t("İsteğin repertuvarımızda yok: {name}", { name }), {
                    tone: "info",
                    duration: 6000,
                });
            }
        }
    }, [items, ids, nowPlaying, toast, t]);
}
