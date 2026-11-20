"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Globe } from "lucide-react";
import { LANGS, setLang, useT } from "@/lib/i18n";

// "Yorum yap"ın yanında: TR / EN / AZ. Seçim telefonda hatırlanır.
export default function LangSwitch() {
    const t = useT();
    const [open, setOpen] = useState(false);
    const boxRef = useRef<HTMLDivElement>(null);
    const current = LANGS.find((l) => l.code === t.lang) ?? LANGS[0];

    // Dışarı dokununca ya da Esc ile kapanır
    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => {
            if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("pointerdown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <div ref={boxRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`${t("Dil seç")}: ${current.label}`}
                className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-raised px-2.5 text-xs font-extrabold text-ink transition hover:bg-line active:scale-95"
            >
                <Globe size={14} className="text-muted" />
                {current.short}
            </button>

            {open && (
                <ul
                    role="menu"
                    className="absolute right-0 top-10 z-[75] w-44 animate-[toast-in_0.15s_ease-out] rounded-2xl border border-line bg-surface p-1.5 shadow-2xl motion-reduce:animate-none"
                >
                    {LANGS.map((l) => {
                        const active = l.code === t.lang;
                        return (
                            <li key={l.code}>
                                <button
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={active}
                                    lang={l.code}
                                    onClick={() => {
                                        setLang(l.code);
                                        setOpen(false);
                                    }}
                                    className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm font-bold transition hover:bg-raised ${
                                        active ? "text-accent" : "text-ink"
                                    }`}
                                >
                                    {l.label}
                                    {active ? (
                                        <Check size={15} strokeWidth={3} />
                                    ) : (
                                        <span className="text-xs text-faint">{l.short}</span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
