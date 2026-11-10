"use client";

import { Music2 } from "lucide-react";
import { useSystem } from "@/lib/system-context";

// Sayfanın en üstünde sabit durur: gece kapalıyken (istek ve oylama kapalı) ya da
// gece içinde istekler kısa süre kapatılınca ziyaretçi neden istek atamadığını görür
export default function ClosedBanner() {
    const { loaded, requestsOpen, votingOpen } = useSystem();
    if (!loaded || requestsOpen) return null;

    const text = votingOpen
        ? "İstekler şu an kapalı, birazdan tekrar açılacak."
        : "Canlı müzik başlayınca istek yapma ve oy verme açılacak.";

    return (
        <div
            role="status"
            className="relative z-10 mx-4 mt-3 flex shrink-0 items-center gap-2.5 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3"
        >
            <Music2 size={18} className="shrink-0 text-accent" />
            <p className="text-sm font-semibold leading-snug text-ink">{text}</p>
        </div>
    );
}
