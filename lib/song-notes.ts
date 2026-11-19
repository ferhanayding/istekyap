// Şarkı notları (sadece dashboard): anahtar ve sınırlar. Sunucu ve tarayıcı ortak kullanır.

export const MAX_NOTE = 4000;

const NON_ALNUM = new RegExp("[^\\p{L}\\p{N}]+", "gu");
const norm = (s: string) => s.toLocaleLowerCase("tr").replace(NON_ALNUM, " ").trim();

// Aynı şarkı her yerde biraz farklı yazılabilir: playlistte "Unuttun mu Beni?",
// aramada "Unuttun Mu Beni - Live", istekte "(2011 Remaster)". Not şarkıya bağlı kalsın diye
// ad (parantez ve " - ..." ekleri atılmış) + ilk sanatçı ile eşleştirilir.
export function songKey(name: string, artists: string): string {
    const base = name.replace(/\s*[([].*$/, "").replace(/\s+-\s+.*$/, "");
    const first = artists.split(",")[0] ?? "";
    return `${norm(base) || norm(name)}|${norm(first)}`;
}

export type SongNote = { key: string; body: string; updatedAt: string };
