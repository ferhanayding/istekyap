import { Heart, Music2, Plus } from "lucide-react";

export default function BottomNav() {
    return (
        <nav className="relative z-10 shrink-0 border-t border-white/[0.07] bg-[#171428]/95 px-8 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
            <div className="flex items-center justify-around">
                <button className="flex flex-col items-center gap-1.5 text-[#A58AFF]">
                    <Music2 size={21} />
                    <span className="text-[10px] font-bold">Playlist</span>
                </button>

                <button className="flex flex-col items-center gap-1.5 text-[#77708F]">
                    <Plus size={21} />
                    <span className="text-[10px] font-medium">İstek Yap</span>
                </button>

                <button className="flex flex-col items-center gap-1.5 text-[#77708F]">
                    <Heart size={21} />
                    <span className="text-[10px] font-medium">Popüler</span>
                </button>
            </div>
        </nav>
    );
}