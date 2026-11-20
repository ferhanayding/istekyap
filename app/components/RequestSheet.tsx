"use client";

import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { isBlockedComment } from "@/lib/blocklist";
import { useT } from "@/lib/i18n";
import type { MsgKey } from "@/lib/i18n-dict";
import { sendRequest, type SendResult } from "@/lib/send-request";
import { MAX_REQUEST_NOTE, cleanNote, hasLink } from "@/lib/visitor-types";

export type SheetSong = {
    id: string;
    name: string;
    artists?: string;
    cover?: string | null;
};
export type SentResult = Extract<SendResult, { ok: true }>;

// Not gönderilmeden de denetlenir (sunucu aynısını tekrar yapar)
function noteProblem(note: string): MsgKey | null {
    if (isBlockedComment(note)) return "Notunda uygunsuz bir kelime var.";
    if (hasLink(note)) return "Nota link eklenemez.";
    return null;
}

// "İste", "Ben de" ya da aramadan seçilen şarkı: istek gitmeden önce bu kutu açılır.
// İsteyen kısa bir not yazabilir ("Ayşe'nin doğum günü"); not sadece dashboard'da, isteğin
// altında görünür. Yanlışlıkla dokunulunca da istek hakkı boşa gitmez.
export default function RequestSheet({
    song,
    join = false,
    onClose,
    onSent,
}: {
    song: SheetSong;
    /** Bu geceki listede başkasının isteğine katılma */
    join?: boolean;
    onClose: () => void;
    onSent: (r: SentResult) => void;
}) {
    const [note, setNote] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const t = useT();

    // Gönderilirken kapanmasın: cevap gelince ne olduğu görünsün
    function close() {
        if (!sending) onClose();
    }
    const onEscape = useEffectEvent(() => close());

    // Esc ile kapat, arkadaki sayfa kaymasın. Klavye kendiliğinden açılmasın diye
    // yazı kutusuna değil kutunun kendisine odaklanılır: notu çoğu kişi yazmayacak.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onEscape();
        };
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        sheetRef.current?.focus();
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, []);

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (sending) return;
        const clean = cleanNote(note);
        const bad = clean ? noteProblem(clean) : null;
        if (bad) {
            setError(t(bad));
            return;
        }
        setError(null);
        setSending(true);
        const r = await sendRequest(song.id, clean || undefined);
        setSending(false);
        if (!r.ok) {
            setError(t.server(r.error));
            return;
        }
        onSent(r);
    }

    return createPortal(
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
            <div className="absolute inset-0 bg-black/70" onClick={close} aria-hidden />

            <div
                ref={sheetRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="istek-baslik"
                tabIndex={-1}
                className="relative w-full max-w-md animate-[mini-in_0.25s_ease-out] rounded-t-3xl border border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink shadow-2xl outline-none motion-reduce:animate-none sm:rounded-3xl"
            >
                <button
                    type="button"
                    onClick={close}
                    aria-label={t("Kapat")}
                    className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-raised text-muted transition hover:bg-line"
                >
                    <X size={17} />
                </button>

                <div className="flex items-center gap-3 pr-10">
                    {song.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={song.cover}
                            alt=""
                            width={56}
                            height={56}
                            className="size-14 shrink-0 rounded-[4px] object-cover"
                        />
                    ) : (
                        <div className="size-14 shrink-0 rounded-[4px] bg-line" />
                    )}
                    <div className="min-w-0">
                        <h2 id="istek-baslik" className="truncate text-lg font-extrabold leading-tight">
                            {song.name}
                        </h2>
                        {song.artists && (
                            <p className="mt-0.5 truncate text-sm text-muted">{song.artists}</p>
                        )}
                    </div>
                </div>

                <form onSubmit={submit} noValidate className="mt-5">
                    <label htmlFor="istek-not" className="block text-xs font-bold text-muted">
                        {t("Kime ya da neden?")}{" "}
                        <span className="font-normal">{t("(isteğe bağlı)")}</span>
                    </label>
                    <input
                        id="istek-not"
                        value={note}
                        onChange={(e) => {
                            setNote(e.target.value);
                            setError(null);
                        }}
                        maxLength={MAX_REQUEST_NOTE}
                        autoComplete="off"
                        enterKeyHint="send"
                        placeholder={t("Örn. Ayşe'nin doğum günü 🎂")}
                        className="mt-1.5 h-11 w-full rounded-xl bg-raised px-3.5 text-base text-ink outline-none placeholder:text-faint focus:bg-line"
                    />
                    <div className="mt-1 flex justify-between gap-3 text-xs text-faint">
                        <span>{t("Notu sadece grup görür.")}</span>
                        <span className="tabular-nums">
                            {note.length} / {MAX_REQUEST_NOTE}
                        </span>
                    </div>

                    {error && (
                        <p
                            role="alert"
                            className="mt-3 rounded-lg bg-danger/15 px-3 py-2 text-sm font-medium text-danger"
                        >
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={sending}
                        className="mt-4 flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-accent text-sm font-extrabold text-on-accent transition active:scale-[0.98] disabled:opacity-60"
                    >
                        {sending ? (
                            t("Gönderiliyor…")
                        ) : join ? (
                            <>
                                <Plus size={16} strokeWidth={3} />
                                {t("Ben de iste")}
                            </>
                        ) : (
                            t("İste")
                        )}
                    </button>
                </form>
            </div>
        </div>,
        document.body
    );
}
