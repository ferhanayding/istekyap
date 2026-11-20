import { ImageResponse } from "next/og";
import { FONT, Logo, OG, loadFonts } from "@/lib/og";

// WhatsApp, Instagram, X'te link paylaşılınca görünen önizleme. Derlemede bir kez üretilir.
export const alt = "İstekYap · LƏYSAN: konserde şarkını sen seç";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BAND = "LƏYSAN";
const LINE = "Konserde şarkını sen seç";
const CHIPS = ["Şarkı iste", "Sözleri oku", "Oy ver"];
const SITE = "istekyap.live";

export default async function Image() {
    const fonts = await loadFonts(["İstekYap.", BAND, LINE, ...CHIPS, SITE].join(""), [500, 800]);

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "64px 80px",
                    background: OG.page,
                    color: OG.ink,
                    fontFamily: FONT,
                    position: "relative",
                }}
            >
                {/* Sağ üstten hafif nane ışığı */}
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        backgroundImage:
                            "linear-gradient(235deg, rgba(110,219,166,0.22) 0%, rgba(110,219,166,0) 50%)",
                    }}
                />

                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                    <Logo size={84} />
                    <div style={{ display: "flex", fontSize: 54, fontWeight: 800, letterSpacing: -1.5 }}>
                        İstekYap<span style={{ color: OG.accent }}>.</span>
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>
                        {BAND}
                    </div>
                    <div style={{ marginTop: 18, fontSize: 52, fontWeight: 500, color: OG.muted }}>
                        {LINE}
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 14 }}>
                        {CHIPS.map((c) => (
                            <div
                                key={c}
                                style={{
                                    display: "flex",
                                    padding: "12px 26px",
                                    borderRadius: 999,
                                    background: OG.raised,
                                    fontSize: 30,
                                    fontWeight: 800,
                                }}
                            >
                                {c}
                            </div>
                        ))}
                    </div>
                    <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: OG.accent }}>
                        {SITE}
                    </div>
                </div>
            </div>
        ),
        { ...size, fonts }
    );
}
