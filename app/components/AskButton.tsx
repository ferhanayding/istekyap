"use client";

import { useState } from "react";
import { useSystem } from "@/lib/system-context";
import { sendRequest } from "@/lib/send-request";
import { useToast } from "./Toast";

const CLOSED_TEXT = "İstekler şu an kapalı. Canlı müzik başlayınca açılacak.";

// Listedeki bir şarkıyı tek dokunuşla isteme (playlist ve eski istekler)
export default function AskButton({
    id,
    name,
    rejected = false,
}: {
    id: string;
    name: string;
    /** Bu gece reddedildi: tekrar istenemez */
    rejected?: boolean;
}) {
    const { requestsOpen, played: playedTonight } = useSystem();
    // Bu gece çalındı: tekrar istenemez
    const played = playedTonight.has(id);
    const toast = useToast();
    const [state, setState] = useState<"idle" | "sending" | "done">("idle");

    async function ask() {
        if (!requestsOpen) {
            toast.error(CLOSED_TEXT);
            return;
        }
        setState("sending");
        const r = await sendRequest(id);
        if (!r.ok) {
            setState("idle");
            toast.error(r.error);
            return;
        }
        setState("done");
        toast.success(
            r.count
                ? `İsteğe katıldın · ${r.count} kişi istedi: ${name}`
                : `İstek gönderildi: ${name}`,
        );
    }

    const done = state === "done";
    return (
        <button
            type="button"
            onClick={ask}
            disabled={done || rejected || played || state === "sending"}
            aria-label={`${name} şarkısını iste`}
            className={`h-7 shrink-0 rounded-full px-3 text-xs font-extrabold transition enabled:active:scale-95 ${
                done
                    ? "bg-accent/15 text-accent"
                    : rejected || played || !requestsOpen
                      ? "bg-raised text-faint"
                      : "bg-accent text-on-accent disabled:opacity-60"
            }`}
        >
            {done
                ? "İstendi"
                : played
                  ? "Çalındı"
                  : rejected
                    ? "Reddedildi"
                    : state === "sending"
                      ? "…"
                      : "İste"}
        </button>
    );
}
