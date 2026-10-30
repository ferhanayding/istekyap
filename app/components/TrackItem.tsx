import { Headphones, Music2 } from "lucide-react";
import type { Track } from "@/lib/spotify";

const COLORS = ["#9B87FF", "#37D9BD", "#FF729B", "#FFBD59"];

export default function TrackItem({
    track: t,
    index,
}: {
    track: Track;
    index: number;
}) {
    const color = COLORS[index % COLORS.length];

    return (
        <div className="group flex items-center gap-3 rounded-2xl border border-white/[0.04] bg-[#19162D] p-3 transition-all hover:bg-[#211D3A] active:scale-[0.98]">
            <div className="relative shrink-0">
                {t.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={t.cover}
                        alt={`${t.album} kapağı`}
                        width={58}
                        height={58}
                        className="size-[58px] rounded-xl object-cover"
                    />
                ) : (
                    <div
                        className="flex size-[58px] items-center justify-center rounded-xl"
                        style={{ backgroundColor: color }}
                    >
                        <Music2 size={24} />
                    </div>
                )}
                <span
                    className="absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-[#19162D]"
                    style={{ backgroundColor: color }}
                />
            </div>

            <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-[#F5F2FF]">
                    {t.name}
                </p>
                <p className="mt-1 truncate text-xs text-[#89839F]">{t.artists}</p>
                <p className="mt-1 truncate text-[10px] text-[#625D78]">{t.album}</p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Spotify'da aç"
                    className="flex size-9 items-center justify-center rounded-full bg-white/[0.05] text-[#AAA2C6] transition hover:bg-white/10"
                >
                    <Headphones size={16} />
                </a>

                <button
                    type="button"
                    aria-label={`${t.name} şarkısının sözlerini gör`}
                    className="flex size-9 items-center justify-center rounded-full bg-[#8C70FF]/15 text-[#AA96FF] transition hover:bg-[#8C70FF]/25"
                >
                    <Music2 size={17} />
                </button>
            </div>
        </div>
    );
}