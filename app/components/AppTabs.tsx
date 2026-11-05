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
import { useSystem } from "@/lib/system-context";
import BottomNav, { type Tab } from "./BottomNav";
import RequestsPanel from "./RequestsPanel";
import { useToast } from "./Toast";

export default function AppTabs({ playlist }: { playlist: ReactNode }) {
    const [tab, setTab] = useState<Tab>("playlist");
    const [unread, setUnread] = useState(0);
    const toast = useToast();

    // Playlist kapalıysa sadece istek listesi var
    const showPlaylist = useSystem().playlistVisible;
    const activeTab: Tab = showPlaylist ? tab : "requests";
    const tabRef = useRef(activeTab);

    useEffect(() => {
        tabRef.current = activeTab;
    }, [activeTab]);

    const openRequests = useCallback(() => {
        setTab("requests");
        setUnread(0);
    }, []);

    const handleNew = useCallback(
        (fresh: RequestItem[]) => {
            const text =
                fresh.length === 1
                    ? `Yeni istek: ${fresh[0].name}`
                    : `${fresh.length} yeni istek geldi`;

            toast.show(text, {
                tone: "info",
                duration: 5000,
                icon: <Bell size={17} className="shrink-0 text-[#B9A6FF]" />,
                onClick: openRequests,
            });

            if (tabRef.current !== "requests") setUnread((u) => u + fresh.length);
        },
        [toast, openRequests]
    );

    const feed = useRequestFeed(handleNew);

    function openTab(t: Tab) {
        setTab(t);
        if (t === "requests") setUnread(0);
    }

    return (
        <>
            {/* İkisi de açık kalır, böylece playlist aramanı kaybetmezsin ve liste güncellenmeye devam eder */}
            {showPlaylist && (
                <div
                    className={
                        activeTab === "playlist" ? "flex min-h-0 flex-1 flex-col" : "hidden"
                    }
                >
                    {playlist}
                </div>
            )}
            <div
                className={
                    activeTab === "requests" ? "flex min-h-0 flex-1 flex-col" : "hidden"
                }
            >
                <RequestsPanel feed={feed} />
            </div>

            {showPlaylist && (
                <BottomNav tab={activeTab} unread={unread} onTab={openTab} />
            )}
        </>
    );
}