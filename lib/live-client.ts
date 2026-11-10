"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { LIVE_CHANNEL, LIVE_EVENT, type LiveTopic } from "@/lib/live-topics";

// v: sinyalin sürümü (sunucudaki zaman damgası). Aynı sinyali alan herkes aynı v ile
// ister, böylece Vercel CDN tek cevabı herkese verir.
type Listener = (topic: LiveTopic, v: number) => void;

const listeners = new Set<Listener>();
const statusListeners = new Set<() => void>();
let started = false;
let connected = false;
let wasConnected = false;

function setConnected(v: boolean) {
    if (connected === v) return;
    connected = v;
    statusListeners.forEach((l) => l());

    // Koptuktan sonra geri bağlandıysak arada kaçan sinyal olabilir, hepsini tazele
    if (v && wasConnected) {
        // 5 sn'lik dilim: aynı anda yeniden bağlanan telefonlar aynı adresi ister
        const v = Math.floor(Date.now() / 5000) * 5000;
        listeners.forEach((l) => {
            l("requests", v);
            l("state", v);
        });
    }
    if (v) wasConnected = true;
}

// Sayfa başına tek bağlantı, bütün bileşenler paylaşır.
// Kütüphane sayfa açıldıktan sonra ayrı dosya olarak yüklenir: ilk açılışı yavaşlatmaz.
function ensureChannel() {
    if (started || typeof window === "undefined") return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;
    started = true;

    void import("@supabase/realtime-js")
        .then(({ RealtimeClient }) => {
            const client = new RealtimeClient(new URL("realtime/v1", `${url}/`).href, {
                params: { apikey: key },
            });
            client
                .channel(LIVE_CHANNEL)
                .on("broadcast", { event: LIVE_EVENT }, ({ payload }) => {
                    const topics: unknown = payload?.topics;
                    if (!Array.isArray(topics)) return;
                    const v = typeof payload?.v === "number" ? payload.v : Date.now();
                    for (const t of topics) {
                        if (t === "requests" || t === "state") {
                            listeners.forEach((l) => l(t, v));
                        }
                    }
                })
                .subscribe((status) => setConnected(status === "SUBSCRIBED"));
        })
        .catch(() => {
            // Yüklenemezse yedek yoklama devam eder; bir sonraki bileşen tekrar dener
            started = false;
        });
}

function subscribeStatus(cb: () => void) {
    ensureChannel();
    statusListeners.add(cb);
    return () => statusListeners.delete(cb);
}

// topic değişince onChange(v) çağrılır. Dönen değer: canlı bağlantı var mı.
// whenHidden: sekme arka plandayken de çalışsın (dashboard: yeni istek sesi ve başlık).
export function useLive(
    topic: LiveTopic,
    onChange: (v: number) => void,
    opts: { whenHidden?: boolean } = {}
): boolean {
    const ref = useRef(onChange);
    useEffect(() => {
        ref.current = onChange;
    });
    const whenHidden = opts.whenHidden === true;

    useEffect(() => {
        ensureChannel();
        let timer: ReturnType<typeof setTimeout> | undefined;
        let latest = 0;
        const l: Listener = (t, v) => {
            if (t !== topic) return;
            latest = Math.max(latest, v);
            if (timer) return;
            // Herkes aynı milisaniyede sunucuya yüklenmesin diye kısa, rastgele bir bekleme
            timer = setTimeout(() => {
                timer = undefined;
                if (whenHidden || !document.hidden) ref.current(latest);
            }, 200 + Math.random() * 800);
        };
        listeners.add(l);
        return () => {
            listeners.delete(l);
            if (timer) clearTimeout(timer);
        };
    }, [topic, whenHidden]);

    return useSyncExternalStore(
        subscribeStatus,
        () => connected,
        () => false
    );
}
