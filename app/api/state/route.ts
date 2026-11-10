import { NextRequest, NextResponse } from "next/server";
import { getAppState } from "@/lib/app-state";

export async function GET(req: NextRequest) {
    // ?v=: canlı sinyalden sonra. Değişiklik yeni olduğu için bellekteki 2 sn'lik kopya atlanır;
    // aynı v'yi isteyen herkese CDN aynı cevabı verir.
    const v = req.nextUrl.searchParams.has("v");
    try {
        const state = await getAppState({ fresh: v });
        return NextResponse.json(state, {
            headers: {
                "Cache-Control": v
                    ? "public, s-maxage=30"
                    : "public, s-maxage=2",
            },
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Durum alınamadı." }, { status: 500 });
    }
}
