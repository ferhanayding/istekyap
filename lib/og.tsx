import "server-only";
import { cacheLife } from "next/cache";

// Sitenin ürettiği görseller (link önizlemesi, gecenin Instagram kartı, iPhone ikonu) için
// ortak renkler, logo ve yazı tipi. Renkler app/globals.css'teki @theme ile aynı.
export const OG = {
    page: "#121110",
    surface: "#1a1916",
    raised: "#26241f",
    line: "#332f29",
    ink: "#f3eee5",
    muted: "#b5aea2",
    faint: "#948d82",
    accent: "#6edba6",
    onAccent: "#05200f",
} as const;

// Ses dalgası + oynat işareti (app/icon.svg ile aynı çizim)
export function Logo({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 64 64">
            <path
                d="M17 21a16 16 0 0 0 0 22"
                fill="none"
                stroke={OG.ink}
                strokeWidth="4.5"
                strokeLinecap="round"
            />
            <path
                d="M24.5 26a8.5 8.5 0 0 0 0 12"
                fill="none"
                stroke={OG.ink}
                strokeWidth="4.5"
                strokeLinecap="round"
            />
            <path
                d="M31 20.5v23a2 2 0 0 0 3 1.7l18-11.5a2 2 0 0 0 0-3.4l-18-11.5a2 2 0 0 0-3 1.7z"
                fill={OG.accent}
            />
        </svg>
    );
}

export const FONT = "Bricolage";
export type FontWeight = 500 | 700 | 800;
type Font = { name: string; data: ArrayBuffer; weight: FontWeight; style: "normal" };

// Bricolage Grotesque, Google Fonts'tan sadece görselde geçen harflerle (küçük dosya).
// Görsel üretici woff2 okuyamaz; tarayıcı olmayan bir istemciye Google TTF verir.
// Önbellek düz veri sakladığı için dosyalar base64 tutulur.
async function fetchFonts(chars: string, weights: FontWeight[]) {
    "use cache";
    cacheLife("max");

    const family = `Bricolage+Grotesque:wght@${[...weights].sort().join(";")}`;
    const res = await fetch(
        `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(chars)}`
    );
    if (!res.ok) throw new Error(`Google Fonts CSS: ${res.status}`);
    const css = await res.text();

    const fonts: { weight: FontWeight; b64: string }[] = [];
    for (const [, body] of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
        const weight = Number(/font-weight:\s*(\d+)/.exec(body)?.[1]) as FontWeight;
        const src = /src:\s*url\(([^)]+)\)\s*format\(['"]?(?:truetype|opentype)['"]?\)/.exec(body)?.[1];
        if (!src || !weights.includes(weight)) continue;
        const file = await fetch(src);
        if (!file.ok) throw new Error(`Google Fonts dosya: ${file.status}`);
        fonts.push({ weight, b64: Buffer.from(await file.arrayBuffer()).toString("base64") });
    }
    if (!fonts.length) throw new Error("Google Fonts: TTF bulunamadı");
    return fonts;
}

// Alınamazsa boş liste: görsel next/og'un kendi yazı tipiyle yine çıkar
export async function loadFonts(text: string, weights: FontWeight[]): Promise<Font[]> {
    // Her harf bir kez yeter (adres kısa kalır); boşluk her zaman lazım
    const chars = [...new Set(`${text} `)].sort().join("");
    try {
        const list = await fetchFonts(chars, weights);
        return list.map(({ weight, b64 }) => ({
            name: FONT,
            weight,
            style: "normal",
            data: new Uint8Array(Buffer.from(b64, "base64")).buffer,
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}
