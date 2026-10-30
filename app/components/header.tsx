import Link from "next/link";
import { Disc3, LayoutDashboard } from "lucide-react";

export default function Header() {
    return (
        <header className="relative shrink-0 px-6 pb-4 pt-8">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="size-2 shrink-0 rounded-full bg-[#00D1B2] shadow-[0_0_12px_#00D1B2]" />
                        <span className="truncate text-[10px] font-bold uppercase tracking-[3px] text-[#8D84AB]">
                            LIVE MUSIC EXPERIENCE
                        </span>
                    </div>

                    <h1 className="mt-2 text-[38px] font-extrabold leading-none tracking-[-2px]">
                        İstek<span className="text-[#9B80FF]">Yap.</span>
                    </h1>

                    <p className="mt-1.5 truncate text-sm text-[#928BA8]">
                        LƏYSAN grubunun müzik dünyası
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <Link
                        href="/dashboard"
                        aria-label="Dashboard girişi"
                        className="flex size-12 items-center justify-center rounded-2xl border border-[#9B80FF]/30 bg-[#8C70FF]/15 text-[#B9A6FF] transition hover:bg-[#8C70FF]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9B80FF] active:scale-95"
                    >
                        <LayoutDashboard size={22} />
                    </Link>

                    <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                        <Disc3 size={25} className="text-[#A58AFF]" />
                    </div>
                </div>
            </div>
        </header>
    );
}