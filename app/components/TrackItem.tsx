import { Music2, ThumbsDown, ThumbsUp } from "lucide-react";
import type { Track } from "@/lib/spotify";
import type { MyVote } from "@/lib/use-votes";
import { addedInfo } from "@/lib/added";
const COLORS = ["#9B87FF", "#37D9BD", "#FF729B", "#FFBD59"];

export default function TrackItem({
    track: t,
    index,
    likes,
    mine,
    onVote,
}: {
    track: Track;
    index: number;
    likes: number;
    mine: MyVote;
    onVote: (id: string, value: 1 | -1) => void;
}) {
    const color = COLORS[index % COLORS.length];
    const added = addedInfo(t.addedAt);
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.04] bg-[#19162D] p-2.5 transition-colors hover:bg-[#211D3A]">
            <div className="relative shrink-0">
                {t.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={t.cover}
                        alt={`${t.album} kapağı`}
                        width={52}
                        height={52}
                        className="size-[52px] rounded-xl object-cover"
                    />
                ) : (
                    <div
                        className="flex size-[52px] items-center justify-center rounded-xl"
                        style={{ backgroundColor: color }}
                    >
                        <Music2 size={22} />
                    </div>
                )}
                <span
                    className="absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-[#19162D]"
                    style={{ backgroundColor: color }}
                />
            </div>

            <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-[#F5F2FF]">{t.name}</p>
                <p className="mt-0.5 truncate text-xs text-[#89839F]">{t.artists}</p>
                <p className="mt-0.5 truncate text-[10px] text-[#625D78]">{t.album}</p>
                {added && (
                    <p className="mt-0.5 truncate text-[10px] text-[#625D78]">
                        {added.label}
                        {added.isNew && (
                            <span className="ml-1 rounded-full bg-[#37D9BD]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#37D9BD]">
                                Yeni
                            </span>
                        )}
                    </p>
                )}
            </div>

            <div className="flex w-[92px] shrink-0 flex-col gap-1.5">
                <div className="flex gap-1.5">
                    <button
                        type="button"
                        onClick={() => onVote(t.id, 1)}
                        aria-pressed={mine === 1}
                        aria-label={`${t.name} şarkısını beğen`}
                        className={`flex h-7 flex-1 items-center justify-center gap-1 rounded-full text-xs font-bold transition active:scale-95 ${mine === 1
                            ? "bg-[#37D9BD]/20 text-[#37D9BD]"
                            : "bg-white/[0.05] text-[#AAA2C6] hover:bg-white/10"
                            }`}
                    >
                        <ThumbsUp size={13} fill={mine === 1 ? "currentColor" : "none"} />
                        {likes}
                    </button>

                    <button
                        type="button"
                        onClick={() => onVote(t.id, -1)}
                        aria-pressed={mine === -1}
                        aria-label={`${t.name} şarkısını beğenme`}
                        className={`flex h-7 w-8 items-center justify-center rounded-full transition active:scale-95 ${mine === -1
                            ? "bg-[#FF729B]/20 text-[#FF729B]"
                            : "bg-white/[0.05] text-[#AAA2C6] hover:bg-white/10"
                            }`}
                    >
                        <ThumbsDown size={13} fill={mine === -1 ? "currentColor" : "none"} />
                    </button>
                </div>

                <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${t.name} şarkısını Spotify'da aç, sözlerine bak`}
                    className="flex h-7 items-center justify-center gap-1.5 rounded-full bg-[#8C70FF]/15 text-xs font-bold text-[#AA96FF] transition hover:bg-[#8C70FF]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9B80FF]"
                >
                    <Music2 size={13} />
                    Sözler
                </a>
            </div>
        </div>
    );
}