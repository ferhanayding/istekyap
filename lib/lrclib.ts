import "server-only";

// Şarkı sözleri LRCLIB'den (lrclib.net): açık, ücretsiz söz veritabanı, anahtar istemez.
// Hem herkese açık sayfada hem dashboard'da Sözler butonuyla açılır (app/api/lyrics).

export type Lyrics = {
    title: string;
    artist: string;
    lyrics: string;
};

export type LyricsResult =
    | { ok: true; song: Lyrics }
    | { ok: false; reason: "not_found" | "instrumental" };

type Hit = {
    trackName: string;
    artistName: string;
    instrumental: boolean;
    plainLyrics: string | null;
};

// LRCLIB uygulamaların kendini tanıtmasını istiyor
const UA = "IstekYap/1.0 (sarki istek dashboard)";

const NON_ALNUM = new RegExp("[^\\p{L}\\p{N}]+", "gu");
const norm = (s: string) => s.toLocaleLowerCase("tr").replace(NON_ALNUM, " ").trim();
// "Şarkı (feat. X) - Remastered 2011" -> "şarkı"
const baseTitle = (s: string) =>
    norm(s.replace(/\s*[([].*$/, "").replace(/\s+-\s+.*$/, ""));

async function search(params: Record<string, string>): Promise<Hit[]> {
    const res = await fetch(
        `https://lrclib.net/api/search?${new URLSearchParams(params)}`,
        {
            headers: { "User-Agent": UA },
            cache: "no-store",
            signal: AbortSignal.timeout(8000),
        }
    );
    if (!res.ok) throw new Error(`LRCLIB: ${res.status}`);
    const data: unknown = await res.json();
    return Array.isArray(data) ? (data as Hit[]) : [];
}

function pick(hits: Hit[], name: string, artist: string): Hit | null {
    const wantTitle = baseTitle(name);
    const wantArtist = norm(artist);

    let best: { hit: Hit; score: number } | null = null;
    for (const hit of hits) {
        if (!hit.plainLyrics && !hit.instrumental) continue;
        const title = baseTitle(hit.trackName);
        const artists = norm(hit.artistName);

        let score = 0;
        if (title === wantTitle) score += 3;
        else if (title.includes(wantTitle) || wantTitle.includes(title)) score += 1;
        else continue;

        if (wantArtist) {
            if (artists === wantArtist) score += 3;
            else if (artists.includes(wantArtist) || wantArtist.includes(artists)) score += 2;
            else continue; // başka sanatçının cover'ı
        }
        if (!/remix|mix|live|canlı|karaoke/.test(norm(hit.trackName))) score += 1;

        if (!best || score > best.score) best = { hit, score };
    }
    return best?.hit ?? null;
}

// Aynı şarkı tekrar istenince LRCLIB'e gidilmez
const DAY = 24 * 60 * 60 * 1000;
const cache = new Map<string, { value: LyricsResult; expires: number }>();

export async function getLyrics(name: string, artists: string): Promise<LyricsResult> {
    // Birden fazla sanatçı varsa ilki
    const artist = artists.split(",")[0].trim();
    const key = `${norm(artist)}|${norm(name)}`;
    const cached = cache.get(key);
    if (cached && Date.now() < cached.expires) return cached.value;

    const title = baseTitle(name) || norm(name);
    let hit = pick(
        await search({ track_name: title, ...(artist ? { artist_name: artist } : {}) }),
        name,
        artist
    );
    // Alan aramasında çıkmazsa serbest arama
    if (!hit) hit = pick(await search({ q: `${artist} ${title}`.trim() }), name, artist);

    const value: LyricsResult = !hit
        ? { ok: false, reason: "not_found" }
        : hit.instrumental || !hit.plainLyrics
            ? { ok: false, reason: "instrumental" }
            : {
                ok: true,
                song: {
                    title: hit.trackName,
                    artist: hit.artistName,
                    lyrics: hit.plainLyrics.trim(),
                },
            };

    // Bulunan söz 7 gün, bulunamayan 1 saat saklanır (sonra eklenmiş olabilir)
    if (cache.size >= 300) cache.clear();
    cache.set(key, { value, expires: Date.now() + (value.ok ? 7 * DAY : DAY / 24) });
    return value;
}
