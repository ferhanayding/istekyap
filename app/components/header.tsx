import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import CommentButton from "./CommentButton";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, InstagramIcon } from "./Instagram";

export default function Header() {
    return (
        <header className="relative shrink-0 px-5 pb-2 pt-4">
            <div className="flex items-center justify-between gap-3">
                <h1 className="text-[26px] font-extrabold leading-none tracking-[-1px]">
                    İstekYap<span className="text-accent">.</span>
                </h1>

                <div className="flex shrink-0 items-center gap-2">
                    <CommentButton />
                    <Link
                        href="/dashboard"
                        aria-label="Dashboard girişi"
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent transition hover:bg-accent/25 active:scale-95"
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
                className="group mt-2 inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(90deg,#833AB4,#C13584_70%,#D6306F)] py-1 pl-2 pr-3 text-white transition hover:brightness-110 active:scale-95"
            >
                <span>
                    <InstagramIcon size={14} />
                </span>
                <span className="text-xs font-bold uppercase tracking-[2px]">
                    LƏYSAN
                </span>
                <span className="text-xs font-semibold">
                    {INSTAGRAM_HANDLE}
                </span>
            </a>

            <p className="mt-1.5 text-xs leading-snug text-muted">
                Dilediğin şarkıyı iste · Sözleri dinle · Şarkıları değerlendir
            </p>
        </header>
    );
}
