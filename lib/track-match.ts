// Spotify arama sonuçlarını temizler: canlı/remix gibi sürümleri eler,
// playlistimizdeki şarkıyla aynı olanı bizim sürümümüze çevirir.
import { isBlocked } from "./blocklist";

export type Candidate = {
    id: string;
    name: string;
    artists: string;
    album?: string;
    cover?: string | null;
};

function fold(s: string): string {
    return s
        .toLocaleLowerCase("tr")
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/ə/g, "e") // LƏYSAN = Leysan
        .replace(/ı/g, "i");
}

const squish = (s: string) => s.replace(/[^a-z0-9]+/g, " ").trim();

// Başlığın parantez içi ve " - " sonrası kısmı (Live, Remix, Remastered...)
function extras(name: string): string {
    const out: string[] = [];
    for (const m of name.matchAll(/[([]([^)\]]*)[)\]]/g)) out.push(m[1]);
    const dash = name.split(/\s[-–—]\s/).slice(1);
    out.push(...dash);
    return fold(out.join(" "));
}

const ALT_WORDS =
    /\b(live|canli|konser|akustik|acoustic|unplugged|remix|karaoke|instrumental|enstrumantal|cover|sped up|slowed|reverb|demo|tribute|medley|8d)\b/;
const LIVE_ALBUM = /\b(live|canli|konser|unplugged|acoustic|akustik)\b/;

// Canlı, remix, akustik vb. farklı bir sürüm mü?
export function isAltVersion(c: Candidate): boolean {
    if (ALT_WORDS.test(extras(c.name))) return true;
    if (c.album && LIVE_ALBUM.test(fold(c.album))) return true;
    return false;
}

export function baseTitle(name: string): string {
    const cut = name.split(/\s[-–—]\s/)[0].replace(/[([][^)\]]*[)\]]/g, " ");
    return squish(fold(cut).replace(/\b(feat|ft|featuring)\b.*$/, ""));
}

export function firstArtist(artists: string): string {
    return squish(fold(artists.split(/,|&| ve | x /)[0] ?? ""));
}

// Aynı şarkıyı farklı kayıtlardan tanımak için anahtar
export function songKey(c: Candidate): string {
    return `${baseTitle(c.name)}|${firstArtist(c.artists)}`;
}

export type Marked<T> = T & { inPlaylist: boolean };

export function cleanResults<T extends Candidate>(
    results: T[],
    playlist: Candidate[]
): Marked<T>[] {
    const byId = new Map(playlist.map((p) => [p.id, p]));
    const byKey = new Map<string, Candidate>();
    for (const p of playlist) {
        const k = songKey(p);
        if (!byKey.has(k)) byKey.set(k, p);
    }

    const seen = new Set<string>();
    const out: Marked<T>[] = [];

    for (const r of results) {
        if (isBlocked(`${r.name} ${r.artists}`)) continue;

        let item: Marked<T>;
        const own = byId.get(r.id);
        if (own) {
            item = { ...r, inPlaylist: true };
        } else {
            if (isAltVersion(r)) continue;
            const twin = byKey.get(songKey(r));
            item = twin
                ? {
                    ...r,
                    id: twin.id,
                    name: twin.name,
                    artists: twin.artists,
                    album: twin.album ?? r.album,
                    cover: twin.cover ?? r.cover,
                    inPlaylist: true,
                }
                : { ...r, inPlaylist: false };
        }

        const key = item.inPlaylist ? `id:${item.id}` : songKey(item);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(item);
    }
    return out;
}

// Playlistimizde sorguya uyanlar (Spotify döndürmese bile listede çıksın)
export function searchPlaylist<T extends Candidate>(
    query: string,
    playlist: T[],
    limit = 5
): T[] {
    const words = squish(fold(query)).split(" ").filter(Boolean);
    if (!words.length) return [];
    return playlist
        .filter((t) => {
            const hay = squish(fold(`${t.name} ${t.artists} ${t.album ?? ""}`));
            return words.every((w) => hay.includes(w));
        })
        .slice(0, limit);
}

// Spotify sonuçlarının başına playlist eşleşmelerini ekler, tekrarı önler
export function mergeWithPlaylist<T extends Candidate>(
    query: string,
    spotify: T[],
    playlist: T[]
): Marked<T>[] {
    const own = searchPlaylist(query, playlist).filter(
        (t) => !isBlocked(`${t.name} ${t.artists}`)
    );
    const cleaned = cleanResults(spotify, playlist);
    const ids = new Set(own.map((t) => t.id));
    return [
        ...own.map((t) => ({ ...t, inPlaylist: true })),
        ...cleaned.filter((t) => !ids.has(t.id)),
    ];
}