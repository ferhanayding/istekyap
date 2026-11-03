import { ChevronDown, Music2 } from "lucide-react";
import NowPlayingBadge from "./NowPlayingBadge";
import { lyricsUrl } from "@/lib/lyrics";
export default function NowPlayingCard({
    id,
    name,
    artists,
    onClick,
}: {
    id: string;
    name: string;
    artists?: string;
    onClick?: () => void;
}) {
    const content = (
        <>
            <NowPlayingBadge className="shrink-0" />
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#F5F2FF]">
                {name}
                {artists && (
                    <span className="ml-1.5 text-xs font-medium text-[#89A8A2]">
                        {artists}
                    </span>
                )}
            </span>
            {onClick && (
                <ChevronDown size={16} className="shrink-0 text-[#37D9BD]/70" />
            )}
        </>
    );

    return (
        <div className="mb-2 flex shrink-0 items-center gap-2 rounded-2xl border border-[#37D9BD]/50 bg-gradient-to-r from-[#17342F] to-[#19162D] py-1.5 pl-3 pr-1.5 shadow-[0_0_24px_-10px_#37D9BD]">
            {onClick ? (
                <button
                    type="button"
                    onClick={onClick}
                    aria-label={`Çalan şarkı: ${name}. Listede göster`}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                    {content}
                </button>
            ) : (
                <div className="flex min-w-0 flex-1 items-center gap-2.5">{content}</div>
            )}

            <a
                href={lyricsUrl(name, artists)} target="_blank"
                rel="noopener noreferrer"
                aria-label={`${name} şarkısının sözlerini Google'da ara`}
                className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-[#8C70FF]/15 px-3 text-xs font-bold text-[#AA96FF] transition hover:bg-[#8C70FF]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9B80FF]"
            >
                <Music2 size={14} />
                Sözler
            </a>
        </div>
    );
}