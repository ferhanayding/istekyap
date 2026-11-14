"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useSystem } from "@/lib/system-context";
import { sendRequest } from "@/lib/send-request";
import { formatWait, useMine } from "@/lib/my-requests";
import { useToast } from "./Toast";

const CLOSED_TEXT = "İstekler şu an kapalı. Canlı müzik başlayınca açılacak.";

// Listedeki bir şarkıyı tek dokunuşla isteme (playlist, eski istekler) ya da
// bu geceki listede başkasının isteğine katılma ("Ben de")
export default function AskButton({
    id,
    name,
    rejected = false,
    join = false,
}: {
    id: string;
    name: string;
    /** Bu gece reddedildi: tekrar istenemez */
    rejected?: boolean;
    /** Bu geceki listede: başkasının isteğine katıl */
    join?: boolean;
}) {
    const { requestsOpen, played: playedTonight } = useSystem();
    const mine = useMine();
    // Bu gece çalındı: tekrar istenemez
    const played = playedTonight.has(id);
    const toast = useToast();
    const [state, setState] = useState<"idle" | "sending" | "done">("idle");

    async function ask() {
        if (!requestsOpen) {
            toast.error(CLOSED_TEXT);
            return;
        }
        // Hakkı dolmuşsa sunucuya gitmeden söyle
        const left = Math.ceil((mine.waitUntil - Date.now()) / 1000);
        if (mine.waiting && left > 0) {
            toast.info(`Sonraki istek hakkın ${formatWait(left)} sonra açılacak.`);
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

    // Reddedilen şarkı: buton yerine küçük, sakin bir not
    if (rejected) {
        return <span className="shrink-0 text-[11px] text-faint">Repertuvarımızda yok</span>;
    }

    const done = state === "done" || mine.ids.has(id);
    const dim = played || !requestsOpen || mine.waiting;
    return (
        <button
            type="button"
            onClick={ask}
            disabled={done || played || state === "sending"}
            aria-label={join ? `${name} şarkısını ben de istiyorum` : `${name} şarkısını iste`}
            className={`flex h-7 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-extrabold transition enabled:active:scale-95 ${
                done
                    ? "bg-accent/15 text-accent"
                    : dim
                      ? "bg-raised text-faint"
                      : "bg-accent text-on-accent disabled:opacity-60"
            }`}
        >
            {done ? (
                "İstedin"
            ) : played ? (
                "Çalındı"
            ) : state === "sending" ? (
                "…"
            ) : join ? (
                <>
                    <Plus size={13} strokeWidth={3} />
                    Ben de
                </>
            ) : (
                "İste"
            )}
        </button>
    );
}
