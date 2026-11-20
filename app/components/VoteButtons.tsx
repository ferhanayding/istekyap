"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { MyVote } from "@/lib/use-votes";
import { useT } from "@/lib/i18n";
import { useToast } from "./Toast";

// Her şarkı kartında durur. Sayılar bugüne kadarki toplamdır, her zaman görünür;
// oy sadece bu gece çalınmış şarkıya ve oylama açıkken verilebilir (yoksa dokununca neden yazar).
export default function VoteButtons({
    id,
    name,
    likes,
    dislikes,
    mine,
    played,
    votingOpen,
    onVote,
}: {
    id: string;
    name: string;
    likes: number;
    dislikes: number;
    mine: MyVote;
    played: boolean;
    votingOpen: boolean;
    onVote: (id: string, value: 1 | -1) => void;
}) {
    const toast = useToast();
    const t = useT();
    const canVote = played && votingOpen;

    function press(value: 1 | -1) {
        if (!votingOpen) return toast.error(t("Oylama şu an kapalı."));
        if (!played) {
            return toast.error(t("Bu şarkı henüz çalınmadı. Çalınca oy verebilirsin."));
        }
        onVote(id, value);
    }

    const base = `flex h-7 min-w-9 items-center justify-center gap-1 rounded-full px-1.5 text-xs font-bold tabular-nums transition ${
        canVote ? "active:scale-95" : "opacity-75"
    }`;

    return (
        <div className="flex shrink-0 items-center gap-1">
            <button
                type="button"
                onClick={() => press(1)}
                aria-disabled={!canVote}
                aria-pressed={mine === 1}
                aria-label={`${t("{name} şarkısını beğen", { name })} (${likes})`}
                className={`${base} ${mine === 1 ? "bg-accent/20 text-accent" : "bg-raised text-muted"}`}
            >
                <ThumbsUp size={13} fill={mine === 1 ? "currentColor" : "none"} />
                {likes}
            </button>

            <button
                type="button"
                onClick={() => press(-1)}
                aria-disabled={!canVote}
                aria-pressed={mine === -1}
                aria-label={`${t("{name} şarkısını beğenme", { name })} (${dislikes})`}
                className={`${base} ${mine === -1 ? "bg-danger/20 text-danger" : "bg-raised text-muted"}`}
            >
                <ThumbsDown size={13} fill={mine === -1 ? "currentColor" : "none"} />
                {dislikes}
            </button>
        </div>
    );
}
