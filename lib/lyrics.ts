// Google'da "<sanatçı> <şarkı> şarkı sözleri" araması
export function lyricsUrl(name: string, artists?: string): string {
    // Birden fazla sanatçı varsa ilkini al, arama daha isabetli olur
    const first = artists?.split(",")[0].trim();
    const q = [first, name, "şarkı sözleri"]
        .filter(Boolean)
        .join(" ")
        .replace(/\s*·\s*/g, " "); // çalan istek başlığı "Ad · Sanatçı" biçiminde gelir
    return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}