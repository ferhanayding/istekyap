"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { LIVE_CHANNEL, LIVE_EVENT, type LiveTopic } from "@/lib/live-topics";

type Listener = (topic: LiveTopic) => void;

const listeners = new Set<Listener>();
const statusListeners = new Set<() => void>();
let channel: RealtimeChannel | null = null;
let connected = false;
let wasConnected = false;

function setConnected(v: boolean) {
    if (connected === v) return;
    connected = v;
    statusListeners.forEach((l) => l());

    // Koptuktan sonra geri bağlandıysak arada kaçan sinyal olabilir, hepsini tazele
    if (v && wasConnected) {
        listeners.forEach((l) => {
            l("requests");
            l("state");
        });
    }
    if (v) wasConnected = true;
}

// Sayfa başına tek bağlantı, bütün bileşenler paylaşır
function ensureChannel() {
    if (channel || typeof window === "undefined") return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;

    const supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    channel = supabase
        .channel(LIVE_CHANNEL)
        .on("broadcast", { event: LIVE_EVENT }, ({ payload }) => {
            const topics: unknown = payload?.topics;
            if (!Array.isArray(topics)) return;
            for (const t of topics) {
                if (t === "requests" || t === "state") {
                    listeners.forEach((l) => l(t));
                }
            }
        })
        .subscribe((status) => setConnected(status === "SUBSCRIBED"));
}

function subscribeStatus(cb: () => void) {
    ensureChannel();
    statusListeners.add(cb);
    return () => statusListeners.delete(cb);
}

// topic değişince onChange çağrılır. Dönen değer: canlı bağlantı var mı
export function useLive(topic: LiveTopic, onChange: () => void): boolean {
    const ref = useRef(onChange);
    useEffect(() => {
        ref.current = onChange;
    });

    useEffect(() => {
        ensureChannel();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const l: Listener = (t) => {
            if (t !== topic || timer) return;
            // Herkes aynı milisaniyede sunucuya yüklenmesin diye rastgele kısa bekleme.
            // state için en az 2,2 sn: sunucudaki 2 sn'lik önbellek tazelensin.
            const base = topic === "state" ? 2200 : 300;
            timer = setTimeout(() => {
                timer = undefined;
                if (!document.hidden) ref.current();
            }, base + Math.random() * 1200);
        };
        listeners.add(l);
        return () => {
            listeners.delete(l);
            if (timer) clearTimeout(timer);
        };
    }, [topic]);

    return useSyncExternalStore(
        subscribeStatus,
        () => connected,
        () => false
    );
}
