import { ListMusic, Search, X } from "lucide-react";

export default function PlaylistHeading({
    subtitle,
    searchOpen = false,
    onToggleSearch,
}: {
    subtitle: string;
    searchOpen?: boolean;
    onToggleSearch?: () => void;
}) {
    return (
        <div className="mb-3 flex shrink-0 items-end justify-between">
            <div>
                <div className="mb-1.5 flex items-center gap-2">
                    <ListMusic size={16} className="text-[#A58AFF]" />
                    <span className="text-[10px] font-bold uppercase tracking-[2px] text-[#8F86AB]">
                        MÜZİK ARŞİVİ
                    </span>
                </div>

                <h2 className="text-2xl font-extrabold tracking-tight">Playlistimiz</h2>

                <p className="mt-1 text-xs text-[#817A98]">{subtitle} · LƏYSAN</p>
            </div>

            <button
                type="button"
                onClick={onToggleSearch}
                disabled={!onToggleSearch}
                aria-label={searchOpen ? "Aramayı kapat" : "Playlistte ara"}
                aria-expanded={searchOpen}
                className="flex size-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.04] text-[#A99EC9] transition hover:bg-white/[0.08] disabled:opacity-50"
            >
                {searchOpen ? <X size={19} /> : <Search size={19} />}
            </button>
        </div>
    );
}