import { ImageResponse } from "next/og";

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
                    background: "linear-gradient(135deg, #8C6CFF, #4A38B0)",
                }}
            >
                <svg width="180" height="180" viewBox="0 0 64 64">
                    <path
                        d="M17 21a16 16 0 0 0 0 22"
                        fill="none"
                        stroke="#1ED760"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                    />
                    <path
                        d="M24.5 26a8.5 8.5 0 0 0 0 12"
                        fill="none"
                        stroke="#1ED760"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                    />
                    <path
                        d="M31 20.5v23a2 2 0 0 0 3 1.7l18-11.5a2 2 0 0 0 0-3.4l-18-11.5a2 2 0 0 0-3 1.7z"
                        fill="#fff"
                    />
                </svg>
            </div>
        ),
        size
    );
}
