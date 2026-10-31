"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { Bell } from "lucide-react";
import { useRequestFeed, type RequestItem } from "@/lib/use-request-feed";
import BottomNav, { type Tab } from "./BottomNav";
import RequestsPanel from "./RequestsPanel";

export default function AppTabs({ playlist }: { playlist: ReactNode }) {
    const [tab, setTab] = useState<Tab>("playlist");
    const [unread, setUnread] = useState(0);
    const [toast, setToast] = useState({ text: "", open: false });
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const tabRef = useRef(tab);

    useEffect(() => {
        tabRef.current = tab;
    }, [tab]);

    useEffect(() => () => clearTimeout(timer.current), []);

    const handleNew = useCallback((fresh: RequestItem[]) => {
        const text =
            fresh.length === 1
                ? `Yeni istek: ${fresh[0].name}`
                : `${fresh.length} yeni istek geldi`;

        setToast({ text, open: true });
        clearTimeout(timer.current);
        timer.current = setTimeout(
            () => setToast((t) => ({ ...t, open: false })),
            5000
        );

        if (tabRef.current !== "requests") setUnread((u) => u + fresh.length);
    }, []);

    const feed = useRequestFeed(handleNew);

    function openTab(t: Tab) {
        setTab(t);
        if (t === "requests") {
            setUnread(0);
            setToast((s) => ({ ...s, open: false }));
        }
    }

    return (
        <>
            {/* İkisi de açık kalır, böylece playlist aramanı kaybetmezsin ve liste güncellenmeye devam eder */}
            <div
                className={
                    tab === "playlist" ? "flex min-h-0 flex-1 flex-col" : "hidden"
                }
            >
                {playlist}
            </div>
            <div
                className={
                    tab === "requests" ? "flex min-h-0 flex-1 flex-col" : "hidden"
                }
            >
                <RequestsPanel feed={feed} />
            </div>

            <BottomNav tab={tab} unread={unread} onTab={openTab} />

            {/* Yeni istek bildirimi */}
            <div
                role="status"
                aria-live="polite"
                className={`absolute inset-x-5 top-4 z-50 transition duration-300 motion-reduce:transition-none ${toast.open
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none -translate-y-3 opacity-0"
                    }`}
            >
                <button
                    type="button"
                    onClick={() => openTab("requests")}
                    tabIndex={toast.open ? 0 : -1}
                    className="flex w-full items-center gap-2 rounded-2xl border border-[#9B80FF]/40 bg-[#2A2255]/95 px-4 py-3 text-left text-sm font-bold shadow-2xl backdrop-blur"
                >
                    <Bell size={16} className="shrink-0 text-[#B9A6FF]" />
                    <span className="min-w-0 flex-1 truncate">{toast.text}</span>
                </button>
            </div>
        </>
    );
}