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
                className={`flex h-7 min-w-[40px] items-center justify-center gap-1 rounded-full px-2 text-xs font-bold transition ${canVote ? "active:scale-95" : "opacity-80"
                    } ${mine === 1
                        ? "bg-accent/20 text-accent"
                        : "bg-raised text-muted"
                    }`}
            >
                <ThumbsUp size={13} fill={mine === 1 ? "currentColor" : "none"} />
                {likes}
            </button>

            <button
                type="button"
                onClick={() => press(-1)}
                aria-disabled={!canVote}
                aria-pressed={mine === -1}
                aria-label={`${name} şarkısını beğenme`}
                className={`flex size-7 items-center justify-center rounded-full transition ${canVote ? "active:scale-95" : "opacity-60"
                    } ${mine === -1
                        ? "bg-danger/20 text-danger"
                        : "bg-raised text-muted"
                    }`}
            >
                <ThumbsDown size={13} fill={mine === -1 ? "currentColor" : "none"} />
            </button>
        </div>
    );
}