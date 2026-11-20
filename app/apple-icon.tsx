import { ImageResponse } from "next/og";
import { Logo, OG } from "@/lib/og";

// iPhone'da "Ana Ekrana Ekle" denince görünen ikon (iOS SVG kabul etmez, PNG üretilir)
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    background: OG.page,
                }}
            >
                <Logo size={180} />
            </div>
        ),
        size
    );
}
