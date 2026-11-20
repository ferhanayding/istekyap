"use client";

import { useSystem } from "@/lib/system-context";
import { useT } from "@/lib/i18n";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, InstagramIcon } from "./Instagram";

// Gece başlamadıysa (ya da bittiyse) siteye giren ilk olarak grubun Instagram'ını kocaman görür.
// Gece açılınca kaybolur, yerine başlıktaki küçük Instagram düğmesi gelir.
export default function FollowUs() {
    const { loaded, nightOpen } = useSystem();
    const t = useT();
    if (!loaded || nightOpen) return null;

    return (
        <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 mx-5 mb-3 block shrink-0 overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#833AB4_0%,#C13584_50%,#E1306C_75%,#F77737_100%)] p-4 text-white shadow-xl transition hover:brightness-110 active:scale-[0.99]"
        >
            <span className="flex items-center gap-3.5">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                    <InstagramIcon size={32} />
                </span>
                <span className="min-w-0">
                    <span className="block text-[11px] font-bold uppercase leading-none tracking-[3px] text-white/80">
                        LƏYSAN
                    </span>
                    <span className="mt-1 block truncate text-[28px] font-extrabold leading-none tracking-tight">
                        {INSTAGRAM_HANDLE}
                    </span>
                </span>
            </span>

            <span className="mt-3 block text-[15px] font-bold leading-snug">
                {t("Bizi Instagram'da takip edebilirsiniz 😃")}
            </span>
            <span className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs font-medium leading-snug text-white/85">
                    {t("Yeni sahneler, videolar ve duyurular orada 🎶🎤")}
                </span>
                <span className="shrink-0 rounded-full bg-white px-4 py-1.5 text-sm font-extrabold text-[#C13584]">
                    {t("Takip et")}
                </span>
            </span>
        </a>
    );
}
