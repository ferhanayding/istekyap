import { NextRequest, NextResponse } from "next/server";
import { getAppState } from "@/lib/app-state";
import { readDeviceId } from "@/lib/device";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { MineResponse } from "@/lib/visitor-types";

const EMPTY: MineResponse = { ids: [], waitSec: 0 };
const NO_STORE = { "Cache-Control": "private, no-store" };

type Row = {
    created_at: string;
    requests: { spotify_id: string; archived_at: string | null } | null;
};

// Kişiye özel: "Senin isteğin" etiketi ve "sonraki isteğe kalan süre" sayacı için.
// Çerez yazmaz: hiç istek atmamış ziyaretçinin kaydı da yoktur.
export async function GET(req: NextRequest) {
    // İstek okunur ki rota derleme anında değil, her istekte çalışsın
    void req.nextUrl.search;

    try {
        const deviceId = await readDeviceId();
        if (!deviceId) return NextResponse.json(EMPTY, { headers: NO_STORE });

        const [state, rows] = await Promise.all([
            getAppState(),
            supabaseAdmin
                .from("request_devices")
                .select("created_at, requests(spotify_id, archived_at)")
                .eq("device_id", deviceId)
                .order("created_at", { ascending: false })
                .limit(200)
                .then(({ data, error }) => {
                    if (error) throw error;
                    return (data ?? []) as unknown as Row[];
                }),
        ]);

        const ids = rows
            .filter((r) => r.requests && !r.requests.archived_at)
            .map((r) => r.requests!.spotify_id);

        // Sunucudaki sınırla aynı hesap (app/api/requests): penceredeki istek sayısı sınıra
        // ulaştıysa, sayılan en eski istek pencereden çıkınca hak açılır
        const windowMs = state.requestWindowMin * 60_000;
        const now = Date.now();
        const recent = rows
            .map((r) => new Date(r.created_at).getTime())
            .filter((t) => t > now - windowMs);
        const waitSec =
            recent.length >= state.requestLimit
                ? Math.max(1, Math.ceil((recent[state.requestLimit - 1] + windowMs - now) / 1000))
                : 0;

        return NextResponse.json({ ids, waitSec } satisfies MineResponse, { headers: NO_STORE });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "İsteklerin alınamadı." }, { status: 500 });
    }
}
