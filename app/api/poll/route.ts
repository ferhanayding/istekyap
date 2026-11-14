import { NextRequest, NextResponse } from "next/server";
import { getOrCreateDeviceId } from "@/lib/device";
import { notifyLive } from "@/lib/live-server";
import { castVote, getVisiblePoll } from "@/lib/poll";
import { getIp, limitDeviceAndIp } from "@/lib/rate-limit";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

// Açık anket ve oy sayıları. Herkese aynı cevap gider (kişinin kendi oyu tarayıcısında durur),
// o yüzden CDN'de saklanabilir. ?v=: canlı sinyalden sonra, bellekteki kopya atlanır.
export async function GET(req: NextRequest) {
    const v = req.nextUrl.searchParams.has("v");
    try {
        const poll = await getVisiblePoll({ fresh: v });
        return NextResponse.json(
            { poll },
            { headers: { "Cache-Control": v ? "public, s-maxage=30" : "public, s-maxage=2" } }
        );
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Anket alınamadı." }, { status: 500 });
    }
}

// Oy ver ya da fikrini değiştir: cihaz başına tek oy
export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);
    const pollId = body?.poll;
    const option = body?.option;
    if (
        typeof pollId !== "string" ||
        !UUID.test(pollId) ||
        typeof option !== "string" ||
        !SPOTIFY_ID.test(option)
    ) {
        return NextResponse.json({ error: "Geçersiz oy." }, { status: 400 });
    }

    try {
        const deviceId = await getOrCreateDeviceId();
        // Cihaz başına dakikada 20 (fikir değiştirmeye yeter), aynı IP'den (ortak Wi-Fi) 600
        const limit = limitDeviceAndIp(
            "poll",
            deviceId,
            getIp(req),
            { limit: 20, windowMs: 60_000 },
            { limit: 600, windowMs: 60_000 }
        );
        if (!limit.ok) {
            return NextResponse.json(
                { error: "Çok hızlı oy veriyorsun, biraz bekle." },
                { status: 429 }
            );
        }

        const result = await castVote(deviceId, pollId, option);
        if (result === "closed") {
            return NextResponse.json({ error: "Oylama bitti." }, { status: 409 });
        }
        if (result === "invalid") {
            return NextResponse.json({ error: "Geçersiz oy." }, { status: 400 });
        }
        notifyLive("poll");
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Oy gönderilemedi. Tekrar dene." }, { status: 500 });
    }
}
