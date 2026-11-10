// Grubun Instagram hesabı: header'daki LƏYSAN ve yorum teşekkür ekranı
export const INSTAGRAM_URL = "https://www.instagram.com/leysanband/";
export const INSTAGRAM_HANDLE = "@leysanband";

// lucide'da marka ikonu yok: sade, tek renk Instagram işareti
export function InstagramIcon({ size = 14 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
        </svg>
    );
}
