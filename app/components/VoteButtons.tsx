"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { MyVote } from "@/lib/use-votes";
import { useToast } from "./Toast";

export default function VoteButtons({
    id,
    name,
    likes,
    mine,
    played,
    votingOpen,
    onVote,
}: {
    id: string;
    name: string;
    likes: number;
    mine: MyVote;
    played: boolean;
    votingOpen: boolean;
    onVote: (id: string, value: 1 | -1) => void;
}) {
    const toast = useToast();
    const canVote = played && votingOpen;

    function press(value: 1 | -1) {
        if (!votingOpen) return toast.error("Oylama şu an kapalı.");
        if (!played) {
            return toast.error("Bu şarkı henüz çalınmadı. Çalınca oy verebilirsin.");
        }
        onVote(id, value);
    }

    return (
        <div className="flex shrink-0 items-center gap-1.5">
            <button
                type="button"
                onClick={() => press(1)}
                aria-disabled={!canVote}
                aria-pressed={mine === 1}
                aria-label={`${name} şarkısını beğen`}
                className={`flex h-8 min-w-[46px] items-center justify-center gap-1 rounded-full px-2.5 text-xs font-bold transition ${canVote ? "active:scale-95" : "opacity-80"
                    } ${mine === 1
                        ? "bg-[#1ED760]/20 text-[#1ED760]"
                        : "bg-white/[0.08] text-[#B3B3B3]"
                    }`}
            >
                <ThumbsUp size={14} fill={mine === 1 ? "currentColor" : "none"} />
                {likes}
            </button>

            <button
                type="button"
                onClick={() => press(-1)}
                aria-disabled={!canVote}
                aria-pressed={mine === -1}
                aria-label={`${name} şarkısını beğenme`}
                className={`flex size-8 items-center justify-center rounded-full transition ${canVote ? "active:scale-95" : "opacity-60"
                    } ${mine === -1
                        ? "bg-[#FF729B]/20 text-[#FF729B]"
                        : "bg-white/[0.08] text-[#B3B3B3]"
                    }`}
            >
                <ThumbsDown size={14} fill={mine === -1 ? "currentColor" : "none"} />
            </button>
        </div>
    );
}