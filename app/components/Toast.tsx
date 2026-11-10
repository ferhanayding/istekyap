"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type Tone = "error" | "info" | "success";
type Options = {
    tone?: Tone;
    icon?: ReactNode;
    duration?: number;
    onClick?: () => void;
};
type Item = {
    id: number;
    text: string;
    tone: Tone;
    icon?: ReactNode;
    onClick?: () => void;
};

type Api = {
    show: (text: string, opts?: Options) => void;
    error: (text: string) => void;
    success: (text: string) => void;
    info: (text: string) => void;
};

const noop = () => { };
const ToastContext = createContext<Api>({
    show: noop,
    error: noop,
    success: noop,
    info: noop,
});

export const useToast = () => useContext(ToastContext);

const STYLE: Record<Tone, { box: string; icon: ReactNode }> = {
    error: {
        box: "border-danger/40 bg-raised text-ink",
        icon: <AlertCircle size={17} className="shrink-0 text-danger" />,
    },
    info: {
        box: "border-line bg-raised text-ink",
        icon: <Info size={17} className="shrink-0 text-muted" />,
    },
    success: {
        box: "border-accent/40 bg-raised text-ink",
        icon: <CheckCircle2 size={17} className="shrink-0 text-accent" />,
    },
};

// fixed: sayfaya göre sabit (dashboard). Değilse en yakın "relative" kutuya göre (telefon çerçevesi)
export function ToastProvider({
    children,
    fixed = false,
}: {
    children: ReactNode;
    fixed?: boolean;
}) {
    const [items, setItems] = useState<Item[]>([]);
    const list = useRef<Item[]>([]);
    const nextId = useRef(1);
    const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

    useEffect(() => {
        const map = timers.current;
        return () => map.forEach((t) => clearTimeout(t));
    }, []);

    const dismiss = useCallback((id: number) => {
        list.current = list.current.filter((t) => t.id !== id);
        const timer = timers.current.get(id);
        if (timer) clearTimeout(timer);
        timers.current.delete(id);
        setItems([...list.current]);
    }, []);

    const show = useCallback(
        (text: string, opts: Options = {}) => {
            const { tone = "info", icon, duration = 4000, onClick } = opts;

            // Aynı mesaj zaten ekrandaysa yenisini ekleme, süresini uzat
            const existing = list.current.find(
                (t) => t.text === text && t.tone === tone
            );
            const id = existing ? existing.id : nextId.current++;
            if (!existing) {
                list.current = [...list.current, { id, text, tone, icon, onClick }].slice(
                    -3
                );
            }

            const old = timers.current.get(id);
            if (old) clearTimeout(old);
            timers.current.set(
                id,
                setTimeout(() => dismiss(id), duration)
            );
            setItems([...list.current]);
        },
        [dismiss]
    );

    const api = useMemo<Api>(
        () => ({
            show,
            error: (text) => show(text, { tone: "error" }),
            success: (text) => show(text, { tone: "success" }),
            info: (text) => show(text, { tone: "info" }),
        }),
        [show]
    );

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div
                aria-live="polite"
                className={`pointer-events-none z-[60] flex flex-col gap-2 ${fixed
                    ? "fixed inset-x-5 top-4 mx-auto max-w-2xl"
                    : "absolute inset-x-5 top-4"
                    }`}
            >
                {items.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        role={t.tone === "error" ? "alert" : "status"}
                        onClick={() => {
                            t.onClick?.();
                            dismiss(t.id);
                        }}
                        className={`pointer-events-auto flex w-full animate-[toast-in_0.25s_ease-out] items-center gap-2.5 rounded-2xl border px-4 py-3 text-left text-sm font-bold shadow-lg motion-reduce:animate-none ${STYLE[t.tone].box}`}
                    >
                        {t.icon ?? STYLE[t.tone].icon}
                        <span className="min-w-0 flex-1">{t.text}</span>
                    </button>
                ))}
            </div>
        </ToastContext.Provider>
    );
}