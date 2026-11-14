import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { LastNightResponse, LastNightSong } from "@/lib/visitor-types";

// Bir gece en fazla bu kadar sürer: son çalınan şarkıdan geriye bu aralık "son gece" sayılır
const NIGHT_SPAN_MS = 10 * 3600_000;

// Gece kapalıyken herkese aynı liste gider: bir dakika bellekte ve CDN'de durur
let cache: { data: LastNightResponse; expires: number } | null = null;

async function build(): Promise<LastNightResponse> {
    const { data: last, error: e1 } = await supabaseAdmin
        .from("play_history")
        .select("played_at")
        .order("played_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (e1) throw e1;
    if (!last) return { date: null, songs: [] };

    const since = new Date(new Date(last.played_at).getTime() - NIGHT_SPAN_MS).toISOString();
    const { data, error } = await supabaseAdmin
        .from("play_history")
        .select("spotify_id, name, artists, cover, played_at")
        .gte("played_at", since)
        .order("played_at", { ascending: true })
        .limit(300);
    if (error) throw error;

    // Çalınma sırasıyla, aynı şarkı bir kez
    const seen = new Set<string>();
    const songs: LastNightSong[] = [];
    for (const p of data ?? []) {
        if (!p.name || seen.has(p.spotify_id)) continue;
        seen.add(p.spotify_id);
        songs.push({ id: p.spotify_id, name: p.name, artists: p.artists ?? "", cover: p.cover });
    }
    return { date: last.played_at, songs };
}

export async function GET(req: NextRequest) {
    // İstek okunur ki rota derleme anında değil, her istekte çalışsın (canlı veri)
    void req.nextUrl.search;
    try {
        if (!cache || Date.now() > cache.expires) {
            cache = { data: await build(), expires: Date.now() + 60_000 };
        }
        return NextResponse.json(cache.data, {
            headers: { "Cache-Control": "public, max-age=30, s-maxage=60" },
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Liste alınamadı." }, { status: 500 });
    }
}
