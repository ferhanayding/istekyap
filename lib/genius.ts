import "server-only";
import * as cheerio from "cheerio";

// Genius'un resmi API'si söz vermiyor, sözler şarkı sayfasından ayıklanır.
// Sadece dashboard'da, sahnede okumak için kullanılır; herkese açık sayfada gösterilmez.

const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export type Lyrics = {
    title: string;
    artist: string;
    url: string;
    lyrics: string;
};

export type LyricsResult =
    | { ok: true; song: Lyrics }
    | { ok: false; reason: "not_found" | "blocked" | "parse_failed" };

type SearchHit = {
    result: {
        title: string;
        artist_names: string;
        primary_artist?: { name: string };
        url: string;
        lyrics_state?: string;
    };
};

// Harf ve rakam dışındaki her şeyi at, küçük harfe çevir
const NON_ALNUM = new RegExp("[^\\p{L}\\p{N}]+", "gu");
const norm = (s: string) => s.toLocaleLowerCase("tr").replace(NON_ALNUM, " ").trim();
// "Şarkı (feat. X) - Remastered 2011" -> "şarkı"
const baseTitle = (s: string) => norm(s.replace(/\s*[([].*$/, "").replace(/\s+-\s+.*$/, ""));

class Blocked extends Error {}

async function get(url: string): Promise<Response> {
    const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html,application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
    });
    // Cloudflare engeli ya da çok sık istek
    if (res.status === 403 || res.status === 429) throw new Blocked(String(res.status));
    return res;
}

async function findSong(name: string, artist: string) {
    const q = `${artist} ${baseTitle(name) || name}`.trim();
    const res = await get(
        `https://genius.com/api/search/song?per_page=10&q=${encodeURIComponent(q)}`
    );
    if (!res.ok) throw new Error(`Genius arama: ${res.status}`);
    const data = await res.json();
    const hits: SearchHit[] = data?.response?.sections?.[0]?.hits ?? [];

    const wantTitle = baseTitle(name);
    const wantArtist = norm(artist);

    let best: { hit: SearchHit; score: number } | null = null;
    for (const hit of hits) {
        const r = hit.result;
        if (r.lyrics_state && r.lyrics_state !== "complete") continue;
        const title = baseTitle(r.title);
        const artists = norm(`${r.artist_names} ${r.primary_artist?.name ?? ""}`);

        // Sanatçı tutmuyorsa (çeviri sayfaları, cover'lar) alma
        const artistOk = !wantArtist || artists.includes(wantArtist) || wantArtist.includes(norm(r.primary_artist?.name ?? "-"));
        if (!artistOk) continue;

        let score = 0;
        if (title === wantTitle) score += 3;
        else if (title.includes(wantTitle) || wantTitle.includes(title)) score += 1;
        else continue;
        if (!/remix|mix|akustik|acoustic|live|canlı/.test(title)) score += 1;

        if (!best || score > best.score) best = { hit, score };
    }
    return best?.hit.result ?? null;
}

function extractLyrics(html: string): string {
    const $ = cheerio.load(html);
    const parts: string[] = [];

    $('[data-lyrics-container="true"]').each((_, el) => {
        const box = $(el);
        // Kutunun içindeki "X Contributors ... Lyrics" gibi başlıklar sözden sayılmaz
        box.find('[data-exclude-from-selection="true"]').remove();
        box.find("br").replaceWith("\n");
        parts.push(box.text());
    });

    return parts
        .join("\n")
        .replace(/\r/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

// Aynı şarkı tekrar istenince Genius'a gidilmez
const DAY = 24 * 60 * 60 * 1000;
const cache = new Map<string, { value: LyricsResult; expires: number }>();

export async function getLyrics(name: string, artists: string): Promise<LyricsResult> {
    // Birden fazla sanatçı varsa ilki
    const artist = artists.split(",")[0].trim();
    const key = `${norm(artist)}|${norm(name)}`;
    const hit = cache.get(key);
    if (hit && Date.now() < hit.expires) return hit.value;

    let value: LyricsResult;
    try {
        const song = await findSong(name, artist);
        if (!song) {
            value = { ok: false, reason: "not_found" };
        } else {
            const res = await get(song.url);
            if (!res.ok) throw new Error(`Genius sayfa: ${res.status}`);
            const lyrics = extractLyrics(await res.text());
            value = lyrics
                ? {
                    ok: true,
                    song: {
                        title: song.title,
                        artist: song.artist_names,
                        url: song.url,
                        lyrics,
                    },
                }
                // Sayfa geldi ama söz kutusu yok: Genius tasarımı değişmiş olabilir
                : { ok: false, reason: "parse_failed" };
        }
    } catch (e) {
        if (e instanceof Blocked) {
            console.error("Genius engelledi:", e.message);
            return { ok: false, reason: "blocked" }; // önbelleğe alma, sonra tekrar denensin
        }
        throw e;
    }

    // Bulunan söz 7 gün, bulunamayan 1 saat saklanır
    if (cache.size >= 300) cache.clear();
    cache.set(key, { value, expires: Date.now() + (value.ok ? 7 * DAY : DAY / 24) });
    return value;
}
