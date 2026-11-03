import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export default function Header() {
    return (
        <header className="relative shrink-0 px-5 pb-1 pt-5">
            <div className="flex items-center justify-between gap-3">
                <h1 className="text-[32px] font-extrabold leading-none tracking-[-1.5px]">
                    İstek<span className="text-[#9B80FF]">Yap.</span>
                </h1>

                <Link
                    href="/dashboard"
                    aria-label="Dashboard girişi"
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#9B80FF]/30 bg-[#8C70FF]/15 text-[#B9A6FF] transition hover:bg-[#8C70FF]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9B80FF] active:scale-95"
                >
                    <LayoutDashboard size={19} />
                </Link>
            </div>

            <p className="mt-1.5 text-[11px] leading-snug text-[#928BA8]">
                Dilediğin şarkıyı iste <span className="text-[#5F5875]">·</span>{" "}
                Sözleri dinle <span className="text-[#5F5875]">·</span> Şarkıları
                değerlendir
            </p>
        </header>
    );
}