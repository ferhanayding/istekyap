import { NextRequest, NextResponse } from "next/server";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { getPlaylistIndex, isInPlaylist } from "@/lib/playlist-index";
import { getTrackById } from "@/lib/search";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

// Listede önce onaylılar, sonra bekleyenler, sonra çalınanlar, en altta reddedilenler
const RANK: Record<string, number> = {
    approved: 0,
    pending: 1,
    played: 2,
    rejected: 3,
};

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

        // 23505: bu şarkı zaten bekliyor, onaylı ya da reddedilmiş
        if (error?.code === "23505") {
            const { data: existing } = await supabaseAdmin
                .from("requests")
                .select("status")
                .eq("spotify_id", track.id)
                .in("status", ["pending", "approved", "rejected"])
                .limit(1)
                .maybeSingle();

            const message =
                existing?.status === "approved"
                    ? "Bu şarkı onaylandı, çalınacak."
                    : existing?.status === "rejected"
                        ? "Bu şarkı reddedildi."
                        : "Bu şarkı zaten istendi.";
            return NextResponse.json({ error: message }, { status: 409 });
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
        .select("id, spotify_id, name, artists, cover, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) {
        console.error(error);
        return NextResponse.json({ error: "Liste alınamadı." }, { status: 500 });
    }

    // sort kararlıdır: aynı durumdakiler yeniden eskiye sıralı kalır
    const sorted = [...(data ?? [])].sort(
        (a, b) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9)
    );

    // Vercel 10 sn boyunca herkese aynı cevabı verir, veritabanı yorulmaz
    return NextResponse.json(sorted, {
        headers: {
            "Cache-Control": "public, s-maxage=10, stale-while-revalidate=10",
        },
    });
}