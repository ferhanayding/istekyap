import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import CommentButton from "./CommentButton";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, InstagramIcon } from "./Instagram";

export default function Header() {
    return (
        <header className="relative shrink-0 px-5 pb-2 pt-4">
            <div className="flex items-center justify-between gap-3">
                <h1 className="text-[26px] font-extrabold leading-none tracking-[-1.2px]">
                    İstek<span className="text-[#B9A6FF]">Yap.</span>
                </h1>

                <div className="flex shrink-0 items-center gap-2">
                    <CommentButton />
                    <Link
                        href="/dashboard"
                        aria-label="Dashboard girişi"
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[#CFC4FF] transition hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9B80FF] active:scale-95"
                    >
                        <LayoutDashboard size={17} />
                    </Link>
                </div>
            </div>

            {/* Grubun Instagram'ı: başlığın altında, telefonda da tam görünür */}
            <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`LƏYSAN Instagram: ${INSTAGRAM_HANDLE}`}
                className="group  inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] py-1 pl-2 pr-3 transition hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9B80FF] active:scale-95"
            >
                <span className="text-[#E1306C]">
                    <InstagramIcon size={14} />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[2px] text-white/85">
                    LƏYSAN
                </span>
                <span className="text-[11px] font-semibold text-white/50 transition group-hover:text-white/80">
                    {INSTAGRAM_HANDLE}
                </span>
            </a>

            <p className="mt-1.5 text-[11px] leading-snug text-white/55">
                Dilediğin şarkıyı iste · Sözleri dinle · Şarkıları değerlendir
            </p>
        </header>
    );
}
