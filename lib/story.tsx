import "server-only";
import { getStats } from "@/lib/stats";
import type { SongStat } from "@/lib/stats-types";
import { FONT, Logo, OG, loadFonts } from "@/lib/og";
import { INSTAGRAM_HANDLE } from "@/app/components/Instagram";

// Gecenin özeti, Instagram hikâyesi boyutunda (app/api/dashboard/story). Sayılar İstatistik
// sekmesindeki "Bu gece" / "Son gece" ile aynı.
export const STORY_SIZE = { width: 1080, height: 1920 };

const dayFmt = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
});
// Dosya adı için 2026-11-20
const fileDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul" });
const num = new Intl.NumberFormat("tr-TR");

const THANKS = "Teşekkürler, yine görüşmek üzere!";
const SITE = `istekyap.live · ${INSTAGRAM_HANDLE}`;
const EMPTY = "Bu gece henüz istek yok.";

// Uzun şarkı adları kartı taşırmasın
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

// En yüksek değerli şarkı (eşitlikte ikinci ölçüte göre)
function top(songs: SongStat[], by: (s: SongStat) => number, tie: (s: SongStat) => number) {
    return (
        songs
            .filter((s) => by(s) > 0)
            .sort((a, b) => by(b) - by(a) || tie(b) - tie(a))[0] ?? null
    );
}

// Kapaklar önceden indirilir: biri gelmezse görsel yine çıkar (gri kutu)
async function coverData(url: string | null): Promise<string | null> {
    if (!url) return null;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return null;
        const type = res.headers.get("content-type") ?? "image/jpeg";
        return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
    } catch {
        return null;
    }
}

type Highlight = {
    title: string;
    badge: string;
    name: string;
    artists: string;
    cover: string | null;
};
export type StoryView = {
    label: string;
    date: string;
    tiles: { value: string; text: string }[];
    highlights: Highlight[];
};

// Gecenin sayıları, öne çıkan iki şarkı (kapaklarıyla) ve yazı tipi
export async function prepareStory() {
    const stats = await getStats();
    const night = stats.night;
    const at = new Date(stats.since ?? stats.until ?? Date.now());

    const requested = top(night.songs, (s) => s.requests, (s) => s.likes);
    const liked = top(night.songs, (s) => s.likes, (s) => -s.dislikes);
    const [requestedCover, likedCover] = await Promise.all([
        coverData(requested?.cover ?? null),
        coverData(liked?.cover ?? null),
    ]);

    const highlight = (title: string, badge: string, s: SongStat, cover: string | null) => ({
        title,
        badge,
        name: cut(s.name, 40),
        artists: cut(s.artists, 34),
        cover,
    });
    const highlights: Highlight[] = [];
    if (requested) {
        highlights.push(
            highlight("EN ÇOK İSTENEN", `${num.format(requested.requests)} kez istendi`, requested, requestedCover)
        );
    }
    if (liked) {
        highlights.push(highlight("EN ÇOK BEĞENİLEN", `${num.format(liked.likes)} beğeni`, liked, likedCover));
    }

    const view: StoryView = {
        label: stats.nightOpen ? "BU GECE" : "GECENİN ÖZETİ",
        date: dayFmt.format(at),
        tiles: [
            { value: night.plays, text: "şarkı çaldık" },
            { value: night.totalRequests, text: "istek geldi" },
            { value: night.people, text: "kişi istek yaptı" },
            { value: night.likes, text: "beğeni" },
        ].map((t) => ({ value: num.format(t.value), text: t.text })),
        highlights,
    };

    // Görselde geçen bütün yazılar: yazı tipi sadece bu harflerle indirilir
    const fonts = await loadFonts(
        [
            "İstekYap.",
            "LƏYSAN",
            THANKS,
            SITE,
            EMPTY,
            view.label,
            view.date,
            ...view.tiles.flatMap((t) => [t.value, t.text]),
            ...highlights.flatMap((h) => [h.title, h.badge, h.name, h.artists]),
        ].join(""),
        [500, 800]
    );

    return { view, fonts, fileName: `leysan-${fileDay.format(at)}.png` };
}

const card = {
    display: "flex",
    borderRadius: 36,
    background: OG.surface,
    border: `2px solid ${OG.line}`,
} as const;

export function StoryImage({ label, date, tiles, highlights }: StoryView) {
    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                // Instagram üstte profil satırı, altta yanıt kutusu gösterir: oralar boş kalır
                padding: "170px 88px 250px",
                background: OG.page,
                color: OG.ink,
                fontFamily: FONT,
                position: "relative",
            }}
        >
            {/* Köşelerde hafif ışık: sağ üst nane, sol alt Instagram pembesi */}
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    backgroundImage:
                        "linear-gradient(210deg, rgba(110,219,166,0.18) 0%, rgba(110,219,166,0) 40%)",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    backgroundImage:
                        "linear-gradient(30deg, rgba(193,53,132,0.16) 0%, rgba(193,53,132,0) 38%)",
                }}
            />

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Logo size={64} />
                <div style={{ display: "flex", fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>
                    İstekYap<span style={{ color: OG.accent }}>.</span>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", marginTop: 48 }}>
                <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 6, color: OG.accent }}>
                    {label}
                </div>
                <div
                    style={{
                        fontSize: 140,
                        fontWeight: 800,
                        letterSpacing: -4,
                        lineHeight: 1,
                        marginTop: 10,
                    }}
                >
                    LƏYSAN
                </div>
                <div style={{ fontSize: 46, fontWeight: 500, color: OG.muted, marginTop: 14 }}>
                    {date}
                </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 44 }}>
                {tiles.map((t) => (
                    <div
                        key={t.text}
                        style={{ ...card, flexDirection: "column", width: 442, padding: "26px 34px" }}
                    >
                        <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>
                            {t.value}
                        </div>
                        <div style={{ fontSize: 34, fontWeight: 500, color: OG.muted, marginTop: 8 }}>
                            {t.text}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 20 }}>
                {highlights.length === 0 && (
                    <div
                        style={{
                            ...card,
                            justifyContent: "center",
                            padding: 40,
                            fontSize: 38,
                            fontWeight: 500,
                            color: OG.muted,
                        }}
                    >
                        {EMPTY}
                    </div>
                )}
                {highlights.map((h) => (
                    <div key={h.title} style={{ ...card, alignItems: "center", gap: 30, padding: 24 }}>
                        {h.cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={h.cover}
                                alt=""
                                width={176}
                                height={176}
                                style={{ borderRadius: 20, objectFit: "cover" }}
                            />
                        ) : (
                            <div
                                style={{
                                    display: "flex",
                                    width: 176,
                                    height: 176,
                                    borderRadius: 20,
                                    background: OG.line,
                                }}
                            />
                        )}
                        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 16,
                                }}
                            >
                                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 4, color: OG.accent }}>
                                    {h.title}
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        padding: "6px 18px",
                                        borderRadius: 999,
                                        background: OG.raised,
                                        fontSize: 26,
                                        fontWeight: 800,
                                    }}
                                >
                                    {h.badge}
                                </div>
                            </div>
                            <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.1, marginTop: 10 }}>
                                {h.name}
                            </div>
                            <div style={{ fontSize: 30, fontWeight: 500, color: OG.muted, marginTop: 6 }}>
                                {h.artists}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "auto" }}>
                <div style={{ fontSize: 44, fontWeight: 800 }}>{THANKS}</div>
                <div style={{ fontSize: 34, fontWeight: 800, color: OG.accent, marginTop: 12 }}>{SITE}</div>
            </div>
        </div>
    );
}
