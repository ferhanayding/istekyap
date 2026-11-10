import "server-only";
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { LIVE_CHANNEL, LIVE_EVENT, type LiveTopic } from "@/lib/live-topics";

// Sadece REST ile gönderir, abone olmaz. Tek kanal nesnesi yeniden kullanılır.
const channel = supabaseAdmin.channel(LIVE_CHANNEL);

// Aynı saniyede gelen değişiklikler tek sinyalde birleşir.
// Her sinyal dinleyen telefon sayısı kadar Realtime mesajı sayılır
// (ücretsiz plan: saniyede 100), o yüzden saniyede en fazla bir sinyal.
const GAP_MS = 1000;
let lastSent = 0;
let scheduled = false;
const pending = new Set<LiveTopic>();

async function flush(wait: number) {
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    const topics = [...pending];
    pending.clear();
    scheduled = false;
    lastSent = Date.now();
    if (topics.length === 0) return;

    // v: bu sinyalin sürümü. Telefonlar /api/...?v= ile ister, CDN tek cevabı herkese verir
    const res = await channel.httpSend(LIVE_EVENT, { topics, v: lastSent }).catch((e) => ({
        success: false as const,
        status: 0,
        error: String(e),
    }));
    // Sinyal gitmezse sorun değil, telefonlar 60 sn'de bir kendileri de bakar
    if (!res.success) console.error("Realtime sinyali gönderilemedi:", res);
}

// Değişiklikten sonra çağır. Cevabı bekletmez, cevap gittikten sonra gönderir.
export function notifyLive(...topics: LiveTopic[]) {
    for (const t of topics) pending.add(t);
    if (scheduled) return;
    scheduled = true;

    const wait = Math.max(0, lastSent + GAP_MS - Date.now());
    try {
        after(() => flush(wait));
    } catch {
        // İstek dışında çağrıldıysa (after kullanılamaz) doğrudan gönder
        void flush(wait);
    }
}
