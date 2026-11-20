"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useSystem } from "@/lib/system-context";
import { sendRequest } from "@/lib/send-request";
import { formatWait, useMine } from "@/lib/my-requests";
import { useT } from "@/lib/i18n";
import { useToast } from "./Toast";

// Listedeki bir şarkıyı tek dokunuşla isteme (playlist, eski istekler) ya da
// bu geceki listede başkasının isteğine katılma ("Ben de")
export default function AskButton({
    id,
    name,
    join = false,
}: {
    id: string;
    name: string;
    /** Bu geceki listede: başkasının isteğine katıl */
    join?: boolean;
}) {
    const { requestsOpen, played: playedTonight } = useSystem();
    const mine = useMine();
    // Bu gece çalındı: tekrar istenemez
    const played = playedTonight.has(id);
    const toast = useToast();
    const t = useT();
    const [state, setState] = useState<"idle" | "sending" | "done">("idle");

    async function ask() {
        if (!requestsOpen) {
            toast.error(t("İstekler şu an kapalı. Canlı müzik başlayınca açılacak."));
            return;
        }
        // Hakkı dolmuşsa sunucuya gitmeden söyle
        const left = Math.ceil((mine.waitUntil - Date.now()) / 1000);
        if (mine.waiting && left > 0) {
            toast.info(t("Sonraki istek hakkın {time} sonra açılacak.", { time: formatWait(left) }));
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
                ? t("İsteğe katıldın · {n} kişi istedi: {name}", { n: r.count, name })
                : t("İstek gönderildi: {name}", { name }),
        );
    }

    const done = state === "done" || mine.ids.has(id);
    const dim = played || !requestsOpen || mine.waiting;
    return (
        <button
            type="button"
            onClick={ask}
            disabled={done || played || state === "sending"}
            aria-label={
                join
                    ? t("{name} şarkısını ben de istiyorum", { name })
                    : t("{name} şarkısını iste", { name })
            }
            className={`flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-extrabold transition enabled:active:scale-95 ${
                done
                    ? "bg-accent/15 text-accent"
                    : dim
                      ? "bg-raised text-faint"
                      : "bg-accent text-on-accent disabled:opacity-60"
            }`}
        >
            {done ? (
                t("İstedin")
            ) : played ? (
                t("Çalındı")
            ) : state === "sending" ? (
                "…"
            ) : join ? (
                <>
                    <Plus size={13} strokeWidth={3} />
                    {t("Ben de")}
                </>
            ) : (
                t("İste")
            )}
        </button>
    );
}
