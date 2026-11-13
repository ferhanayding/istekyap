"use client";

import { REQUEST_SENT_EVENT } from "@/lib/use-request-feed";

export const SEND_ERROR = "İstek gönderilemedi. Tekrar dokun.";

export type SendResult =
    | { ok: true; joined: boolean; count: number | null }
    | { ok: false; error: string };

// Bağlantı takılırsa sıradaki istekler sonsuza kadar beklemesin
const TIMEOUT_MS = 15_000;

async function post(id: string): Promise<SendResult> {
    // AbortSignal.timeout eski telefonlarda yok, o yüzden elle
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch("/api/requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
            signal: ctrl.signal,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return { ok: false, error: data?.error ?? SEND_ERROR };

        // Kendi isteğin listede hemen görünsün (canlı sinyali beklemeden)
        window.dispatchEvent(new Event(REQUEST_SENT_EVENT));
        const joined = !!data?.joined;
        return { ok: true, joined, count: joined ? Number(data.count) || null : null };
    } catch {
        return { ok: false, error: SEND_ERROR };
    } finally {
        clearTimeout(timer);
    }
}

// Aynı anda tek istek gider, sonraki sıraya girer. Arama kutusu, playlist ve "Eski istekler"
// ayrı butonlar olduğu için art arda iki dokunuş aynı anda sunucuya varabiliyordu: ikisi de
// "henüz isteğin yok" cevabını alıp sınırı aşıyordu (ilk istek daha kaydedilmeden).
let last: Promise<unknown> = Promise.resolve();

// Arama kutusu, playlist ve "Eski istekler" aynı yoldan istek atar
export function sendRequest(id: string): Promise<SendResult> {
    const run = last.then(() => post(id));
    last = run;
    return run;
}
