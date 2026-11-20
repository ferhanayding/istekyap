"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Image as ImageIcon, Share2, X } from "lucide-react";

type Ready = { url: string; file: File };

// Gecenin özeti, Instagram hikâyesi boyutunda (app/api/dashboard/story): önizle, telefonda
// "Paylaş" ile doğrudan Instagram'a gönder ya da indir.
export default function StoryButton({ className = "" }: { className?: string }) {
    const [open, setOpen] = useState(false);
    const [ready, setReady] = useState<Ready | null>(null);
    const [failed, setFailed] = useState(false);
    // Kapatıp yeniden açınca eski (geç gelen) cevap yenisinin üstüne yazılmasın
    const run = useRef(0);

    async function load() {
        const id = ++run.current;
        setReady(null);
        setFailed(false);
        try {
            const res = await fetch("/api/dashboard/story", { cache: "no-store" });
            if (!res.ok) throw new Error();
            const blob = await res.blob();
            if (id !== run.current) return;
            const name =
                /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ??
                "leysan-gece.png";
            setReady({
                url: URL.createObjectURL(blob),
                file: new File([blob], name, { type: "image/png" }),
            });
        } catch {
            if (id === run.current) setFailed(true);
        }
    }

    function openSheet() {
        setOpen(true);
        void load();
    }

    function close() {
        run.current++;
        if (ready) URL.revokeObjectURL(ready.url);
        setReady(null);
        setOpen(false);
    }

    // Telefonda dosya paylaşımı varsa (Instagram listede çıkar). Dokunuşun hemen içinde
    // çağrılmalı: dosya önceden hazırlandığı için beklemeden açılır.
    const canShare =
        !!ready &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [ready.file] });

    async function share() {
        if (!ready) return;
        try {
            await navigator.share({ files: [ready.file], title: "LƏYSAN · İstekYap" });
        } catch {
            // Paylaşımdan vazgeçildi
        }
    }

    const btn =
        "flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-sm font-extrabold transition active:scale-[0.98]";

    return (
        <>
            <button
                type="button"
                onClick={openSheet}
                aria-haspopup="dialog"
                className={`flex h-11 items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#833AB4,#C13584_70%,#D6306F)] px-4 text-sm font-extrabold text-white transition hover:brightness-110 active:scale-[0.98] ${className}`}
            >
                <ImageIcon size={16} />
                Gecenin Instagram kartı
            </button>

            {open &&
                createPortal(
                    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
                        <div className="absolute inset-0 bg-black/70" onClick={close} aria-hidden />

                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="kart-baslik"
                            className="relative flex max-h-[96dvh] w-full max-w-md flex-col rounded-t-3xl border border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink shadow-2xl sm:rounded-3xl"
                        >
                            <button
                                type="button"
                                onClick={close}
                                aria-label="Kapat"
                                className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-raised text-muted transition hover:bg-line"
                            >
                                <X size={17} />
                            </button>

                            <h2 id="kart-baslik" className="pr-10 text-lg font-extrabold">
                                Gecenin Instagram kartı
                            </h2>
                            <p className="mt-1 text-xs text-muted">
                                Hikâye boyutunda. Sayılar İstatistik&apos;teki gecenin sayıları.
                            </p>

                            <div className="mt-3 flex min-h-0 flex-1 items-center justify-center">
                                {ready ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={ready.url}
                                        alt="Gecenin özeti"
                                        className="max-h-[60dvh] w-auto max-w-full rounded-xl border border-line"
                                    />
                                ) : failed ? (
                                    <p className="py-16 text-center text-sm text-muted">
                                        Kart hazırlanamadı.{" "}
                                        <button
                                            type="button"
                                            onClick={() => void load()}
                                            className="font-bold text-ink"
                                        >
                                            Tekrar dene
                                        </button>
                                    </p>
                                ) : (
                                    <div
                                        aria-label="Hazırlanıyor"
                                        className="aspect-[9/16] h-[60dvh] max-w-full animate-pulse rounded-xl bg-raised"
                                    />
                                )}
                            </div>

                            <div className="mt-4 flex gap-2">
                                {canShare && (
                                    <button
                                        type="button"
                                        onClick={() => void share()}
                                        className={`${btn} bg-accent text-on-accent`}
                                    >
                                        <Share2 size={16} />
                                        Paylaş
                                    </button>
                                )}
                                <a
                                    href={ready?.url}
                                    download={ready?.file.name}
                                    aria-disabled={!ready}
                                    className={`${btn} ${
                                        canShare ? "bg-raised text-ink" : "bg-accent text-on-accent"
                                    } ${ready ? "" : "pointer-events-none opacity-50"}`}
                                >
                                    <Download size={16} />
                                    İndir
                                </a>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}
