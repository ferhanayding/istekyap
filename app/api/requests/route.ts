import { NextRequest, NextResponse } from "next/server";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { getPlaylistIndex, isInPlaylist } from "@/lib/playlist-index";
import { getTrackById } from "@/lib/search";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

export async function POST(req: NextRequest) {
    const limit = rateLimit(`request:${getIp(req)}`, 5, 10 * 60_000);
    if (!limit.ok) {
        return NextResponse.json(
            { error: "Çok fazla istek gönderdin, biraz bekle." },
            { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
        );
    }

    const body = await req.json().catch(() => null);
    const id = body?.id;
    if (typeof id !== "string" || !SPOTIFY_ID.test(id)) {
        return NextResponse.json({ error: "Geçersiz şarkı." }, { status: 400 });
    }

    try {
        const track = await getTrackById(id);
        if (!track) {
            return NextResponse.json({ error: "Şarkı bulunamadı." }, { status: 404 });
        }

        const index = await getPlaylistIndex().catch(() => null);
        if (index && isInPlaylist(index, track)) {
            return NextResponse.json(
                { error: "Bu şarkı zaten playlistte." },
                { status: 409 }
            );
        }

        const { error } = await supabaseAdmin.from("requests").insert({
            spotify_id: track.id,
            name: track.name,
            artists: track.artists,
            cover: track.cover,
        });

        // 23505: aynı şarkı zaten bekliyor (veritabanındaki benzersiz kural)
        if (error?.code === "23505") {
            return NextResponse.json(
                { error: "Bu şarkı zaten istendi." },
                { status: 409 }
            );
        }
        if (error) throw error;

        return NextResponse.json({ ok: true }, { status: 201 });
    } catch (e) {
        console.error(e);
        return NextResponse.json(
            { error: "İstek gönderilemedi. Tekrar dene." },
            { status: 500 }
        );
    }
}
export async function GET() {
    const { data, error } = await supabaseAdmin
        .from("requests")
        .select("id, spotify_id, name, artists, cover, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        console.error(error);
        return NextResponse.json({ error: "Liste alınamadı." }, { status: 500 });
    }

    // Vercel 10 sn boyunca herkese aynı cevabı verir, veritabanı yorulmaz
    return NextResponse.json(data, {
        headers: {
            "Cache-Control": "public, s-maxage=10, stale-while-revalidate=10",
        },
    });
}