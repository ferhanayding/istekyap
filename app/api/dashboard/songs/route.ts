import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getPlaylistTracks, type Track } from "@/lib/spotify";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Playlist 60 saniye bellekte durur, Spotify'a her turda gidilmez
let cache: { tracks: Track[]; expires: number } | null = null;

async function tracks(): Promise<Track[]> {
    if (cache && Date.now() < cache.expires) return cache.tracks;
    const list = await getPlaylistTracks();
    cache = { tracks: list, expires: Date.now() + 60_000 };
    return list;
}

export async function GET() {
    if (!(await requireUser())) {
        return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    try {
        const [list, votes] = await Promise.all([
            tracks(),
            supabaseAdmin
                .from("song_vote_counts")
                .select("spotify_id, likes, dislikes"),
        ]);
        if (votes.error) throw votes.error;

        const counts = new Map(
            (votes.data ?? []).map((v) => [
                String(v.spotify_id),
                { likes: Number(v.likes), dislikes: Number(v.dislikes) },
            ])
        );

        const out = list.map((t) => ({
            id: t.id,
            name: t.name,
            artists: t.artists,
            cover: t.cover,
            url: t.url,
            likes: counts.get(t.id)?.likes ?? 0,
            dislikes: counts.get(t.id)?.dislikes ?? 0,
        }));

        return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Liste alınamadı." }, { status: 500 });
    }
}