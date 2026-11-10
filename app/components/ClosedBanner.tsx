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
            className="relative z-10 mx-4 mt-3 flex shrink-0 items-center gap-2.5 rounded-2xl border border-[#FF729B]/25 bg-[#FF729B]/[0.12] px-4 py-2.5"
        >
            <Music2 size={16} className="shrink-0 text-[#FF8FB0]" />
            <p className="text-[13px] font-bold leading-snug text-[#FFC2D3]">{text}</p>
        </div>
    );
}
