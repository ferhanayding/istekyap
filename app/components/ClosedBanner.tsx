"use client";

import { Music2 } from "lucide-react";
import { useSystem } from "@/lib/system-context";
import { useT } from "@/lib/i18n";

// Sayfanın en üstünde sabit durur: gece kapalıyken (istek ve oylama kapalı) ya da
// gece içinde istekler kısa süre kapatılınca ziyaretçi neden istek atamadığını görür
export default function ClosedBanner() {
    const { loaded, requestsOpen, votingOpen, nightOpen, nextShow } = useSystem();
    const t = useT();
    if (!loaded || requestsOpen) return null;

    const text = votingOpen
        ? t("İstekler şu an kapalı, birazdan tekrar açılacak.")
        : t("Canlı müzik başlayınca istek yapma ve oy verme açılacak.");

    return (
        <div
            role="status"
            className="relative z-10 mx-4 mt-2 flex shrink-0 items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2"
        >
            <Music2 size={15} className="shrink-0 text-accent" />
            <p className="text-[13px] font-semibold leading-snug text-ink">
                {text}
                {/* Gece kapalıyken: bir sonraki sahnenin günü ve yeri (dashboard'dan yazılır) */}
                {!nightOpen && nextShow && (
                    <span className="mt-0.5 block font-bold text-accent">
                        {t("Sonraki sahne: {x}", { x: nextShow })}
                    </span>
                )}
            </p>
        </div>
    );
}
