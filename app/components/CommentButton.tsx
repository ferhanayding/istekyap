"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Check, MessageSquareText, Star, X } from "lucide-react";
import { INSTAGRAM_URL, InstagramIcon } from "./Instagram";

const LABELS = ["", "Çok kötü", "Kötü", "Fena değil", "İyi", "Harika"];

export default function CommentButton() {
    const [open, setOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [message, setMessage] = useState("");
    const [name, setName] = useState("");
    const [trap, setTrap] = useState(""); // bot tuzağı, kullanıcı görmez
    const [state, setState] = useState<"idle" | "sending" | "done">("idle");
    const [error, setError] = useState<string | null>(null);
    const sheetRef = useRef<HTMLDivElement>(null);

    function close() {
        setOpen(false);
        // Gönderildiyse bir sonraki açılışta form boş gelsin
        if (state === "done") {
            setRating(0);
            setMessage("");
            setName("");
            setState("idle");
        }
        setError(null);
    }

    // Esc ile kapat, arkadaki sayfa kaymasın
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        sheetRef.current?.focus();
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (state === "sending") return;
        if (rating === 0) {
            setError("Önce yıldızlarla bir puan ver.");
            return;
        }
        setError(null);
        setState("sending");
        try {
            const res = await fetch("/api/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating, message, name, website: trap }),
            });
            if (!res.ok) {
                const data = (await res.json().catch(() => null)) as {
                    error?: string;
                } | null;
                throw new Error(data?.error ?? "Gönderilemedi, tekrar dene.");
            }
            setState("done");
        } catch (err) {
            setState("idle");
            setError(err instanceof Error ? err.message : "Gönderilemedi.");
        }
    }

    const shown = rating;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-haspopup="dialog"
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-accent px-3.5 text-xs font-extrabold text-on-accent transition hover:brightness-105 active:scale-95"
            >
                <MessageSquareText size={15} />
                <span>
                    Yorum<span className="hidden min-[400px]:inline"> yap</span>
                </span>
            </button>

            {open &&
                createPortal(
                    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
                        <div
                            className="absolute inset-0 bg-black/70"
                            onClick={close}
                            aria-hidden
                        />

                        <div
                            ref={sheetRef}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="yorum-baslik"
                            tabIndex={-1}
                            className="relative max-h-[92dvh] w-full max-w-md animate-[mini-in_0.25s_ease-out] overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink shadow-2xl outline-none motion-reduce:animate-none sm:rounded-3xl"
                        >
                            <button
                                type="button"
                                onClick={close}
                                aria-label="Kapat"
                                className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-raised text-muted transition hover:bg-line"
                            >
                                <X size={17} />
                            </button>

                            {state === "done" ? (
                                <div className="flex flex-col items-center py-8 text-center">
                                    <span className="flex size-14 items-center justify-center rounded-full bg-accent text-on-accent">
                                        <Check size={28} strokeWidth={3} />
                                    </span>
                                    <h2
                                        id="yorum-baslik"
                                        className="mt-4 text-xl font-extrabold tracking-tight"
                                    >
                                        Teşekkürler!
                                    </h2>
                                    <p className="mt-1 text-sm text-muted">
                                        Yorumun bize ulaştı.
                                    </p>
                                    <a
                                        href={INSTAGRAM_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-6 flex h-11 items-center gap-2 rounded-full bg-[linear-gradient(90deg,#833AB4,#C13584_70%,#D6306F)] px-5 text-sm font-bold text-white transition hover:brightness-110 active:scale-95"
                                    >
                                        <span>
                                            <InstagramIcon size={17} />
                                        </span>
                                        Bizi Instagram&apos;da takip et
                                    </a>
                                    <button
                                        type="button"
                                        onClick={close}
                                        className="mt-3 h-11 rounded-full bg-accent px-8 text-sm font-extrabold text-on-accent transition active:scale-95"
                                    >
                                        Tamam
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={submit} noValidate>
                                    <h2
                                        id="yorum-baslik"
                                        className="pr-10 text-xl font-extrabold tracking-tight"
                                    >
                                        Bize yorum bırak
                                    </h2>
                                    <p className="mt-1 text-sm text-muted">
                                        Bu geceyi nasıl buldun?
                                    </p>

                                    <div
                                        role="radiogroup"
                                        aria-label="Genel puan"
                                        className="mt-4 flex items-center gap-1"
                                    >
                                        {[1, 2, 3, 4, 5].map((n) => (
                                            <button
                                                key={n}
                                                type="button"
                                                role="radio"
                                                aria-checked={rating === n}
                                                aria-label={`${n} yıldız, ${LABELS[n]}`}
                                                onClick={() => {
                                                    setRating(n);
                                                    setError(null);
                                                }}
                                                className="flex size-11 items-center justify-center rounded-full transition active:scale-90"
                                            >
                                                <Star
                                                    size={32}
                                                    strokeWidth={1.8}
                                                    className={
                                                        n <= shown ? "text-accent" : "text-faint"
                                                    }
                                                    fill={n <= shown ? "currentColor" : "none"}
                                                />
                                            </button>
                                        ))}
                                        <span className="ml-2 min-w-20 text-sm font-bold text-accent">
                                            {LABELS[rating]}
                                        </span>
                                    </div>

                                    <label
                                        htmlFor="yorum-metin"
                                        className="mt-4 block text-xs font-bold text-muted"
                                    >
                                        Yorumun
                                    </label>
                                    <textarea
                                        id="yorum-metin"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        maxLength={500}
                                        rows={4}
                                        placeholder="Ne düşündüğünü yaz…"
                                        className="mt-1.5 w-full resize-none rounded-xl bg-raised px-3.5 py-3 text-base text-ink outline-none placeholder:text-faint focus:bg-line"
                                    />
                                    <p className="mt-1 text-right text-xs text-faint">
                                        {message.length} / 500
                                    </p>

                                    <label
                                        htmlFor="yorum-isim"
                                        className="mt-2 block text-xs font-bold text-muted"
                                    >
                                        İsmin <span className="font-normal">(isteğe bağlı)</span>
                                    </label>
                                    <input
                                        id="yorum-isim"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        maxLength={30}
                                        autoComplete="off"
                                        placeholder="Boş bırakırsan anonim"
                                        className="mt-1.5 h-11 w-full rounded-xl bg-raised px-3.5 text-base text-ink outline-none placeholder:text-faint focus:bg-line"
                                    />

                                    {/* Bot tuzağı: insanlar görmez */}
                                    <input
                                        value={trap}
                                        onChange={(e) => setTrap(e.target.value)}
                                        name="website"
                                        tabIndex={-1}
                                        autoComplete="off"
                                        aria-hidden
                                        className="absolute -left-[9999px] size-0 opacity-0"
                                    />

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
                                        disabled={state === "sending"}
                                        className="mt-4 h-12 w-full rounded-full bg-accent text-sm font-extrabold text-on-accent transition active:scale-[0.98] disabled:opacity-60"
                                    >
                                        {state === "sending" ? "Gönderiliyor…" : "Gönder"}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}
