import { ChevronRight, Sparkles } from "lucide-react";

export default function RequestButton() {
    return (
        <section className="relative shrink-0 px-5">
            <button
                type="button"
                className="flex h-12 w-full items-center justify-between rounded-2xl bg-gradient-to-r from-[#7555E9] to-[#5A3FC0] px-4 text-sm font-extrabold shadow-[0_10px_30px_-14px_#795BFF] transition active:scale-[0.98]"
            >
                <span className="flex items-center gap-2">
                    <Sparkles size={17} className="text-[#E5D9FF]" />
                    İstek Parça Yap
                </span>
                <ChevronRight size={18} className="text-white/70" />
            </button>
        </section>
    );
}