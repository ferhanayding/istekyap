import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import CommentButton from "./CommentButton";

export default function Header() {
    return (
        <header className="relative shrink-0 px-5 pb-2 pt-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-baseline gap-2">
                    <h1 className="text-[26px] font-extrabold leading-none tracking-[-1.2px]">
                        İstek<span className="text-[#B9A6FF]">Yap.</span>
                    </h1>
                    <span className="truncate text-[10px] font-bold uppercase tracking-[2.5px] text-white/45">
                        LƏYSAN
                    </span>
                </div>

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

            <p className="mt-1 text-[11px] leading-snug text-white/55">
                Dilediğin şarkıyı iste · Sözleri dinle · Şarkıları değerlendir
            </p>
        </header>
    );
}
