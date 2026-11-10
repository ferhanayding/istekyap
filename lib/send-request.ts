"use client";

import { REQUEST_SENT_EVENT } from "@/lib/use-request-feed";

export const SEND_ERROR = "İstek gönderilemedi. Tekrar dokun.";

export type SendResult =
    | { ok: true; joined: boolean; count: number | null }
    | { ok: false; error: string };

// Arama kutusu ve "Eski istekler" aynı yoldan istek atar
export async function sendRequest(id: string): Promise<SendResult> {
    try {
        const res = await fetch("/api/requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return { ok: false, error: data?.error ?? SEND_ERROR };

        // Kendi isteğin listede hemen görünsün (canlı sinyali beklemeden)
        window.dispatchEvent(new Event(REQUEST_SENT_EVENT));
        const joined = !!data?.joined;
        return { ok: true, joined, count: joined ? Number(data.count) || null : null };
    } catch {
        return { ok: false, error: SEND_ERROR };
    }
}
