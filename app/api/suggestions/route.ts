import { NextResponse, type NextRequest } from "next/server";
import { allRows } from "@/lib/all-rows";
import { isBlocked } from "@/lib/blocklist";
import { getPlaylist } from "@/lib/playlist";

// İstek kutusu açılınca gösterilen öneriler: bugüne kadar en çok beğenilen şarkılar
// (eski gecelerin oyları + bu gecenin oyları). Bu gece çalınanları tarayıcı ayıklar,
// o yüzden gösterilecek sayıdan fazlası gönderilir.
const MAX = 40;

export type Suggestion = {
    id: string;
    name: string;
    artists: string;
    cover: string | null;
    likes: number;
    inPlaylist: boolean;
};

// Beğeniler yavaş değişir: bir dakika bellekte ve CDN'de durur
let cache: { list: Suggestion[]; expires: number } | null = null;

type Meta = { name: string; artists: string; cover: string | null; inPlaylist: boolean };

async function build(): Promise<Suggestion[]> {
    const [voteHist, votes, reqs, playlist] = await Promise.all([
        allRows<{ spotify_id: string; likes: number }>("vote_history", "spotify_id, likes"),
        allRows<{ spotify_id: string; value: number }>("song_votes", "spotify_id, value"),
        allRows<{
            spotify_id: string;
            name: string;
            artists: string;
            cover: string | null;
            status: string;
        }>("requests", "spotify_id, name, artists, cover, status"),
        // Playlist alınamazsa öneriler sadece isteklerden çıkar
        getPlaylist()
            .then((p) => p.tracks)
            .catch(() => []),
    ]);

    const likes = new Map<string, number>();
    const add = (id: string, n: number) => likes.set(id, (likes.get(id) ?? 0) + n);
    for (const v of voteHist) add(String(v.spotify_id), Number(v.likes) || 0);
    for (const v of votes) if (v.value > 0) add(String(v.spotify_id), 1);

    // Şarkının adı ve kapağı: playlistten, yoksa (reddedilmemiş) isteğinden
    const meta = new Map<string, Meta>();
    for (const r of reqs) {
        if (r.status === "rejected") continue;
        meta.set(r.spotify_id, {
            name: r.name,
            artists: r.artists,
            cover: r.cover,
            inPlaylist: false,
        });
    }
    for (const t of playlist) {
        meta.set(t.id, { name: t.name, artists: t.artists, cover: t.cover, inPlaylist: true });
    }

    const out: Suggestion[] = [];
    for (const [id, n] of likes) {
        const m = meta.get(id);
        if (!m || n <= 0) continue;
        if (!m.inPlaylist && isBlocked(`${m.name} ${m.artists}`)) continue;
        out.push({ id, ...m, likes: n });
    }
    return out
        .sort((a, b) => b.likes - a.likes || a.name.localeCompare(b.name, "tr"))
        .slice(0, MAX);
}

export async function GET(req: NextRequest) {
    // İstek okunur ki rota derleme anında değil, her istekte çalışsın (canlı veri)
    void req.nextUrl.search;
    try {
        if (!cache || Date.now() > cache.expires) {
            cache = { list: await build(), expires: Date.now() + 60_000 };
        }
        return NextResponse.json(cache.list, {
            headers: { "Cache-Control": "public, max-age=30, s-maxage=60" },
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Öneriler alınamadı." }, { status: 500 });
    }
}
