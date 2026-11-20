"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from "react";
import { Bell } from "lucide-react";
import { useRequestFeed, type RequestItem } from "@/lib/use-request-feed";
import { useSystem } from "@/lib/system-context";
import { useMyRequestAlerts } from "@/lib/my-requests";
import { CLEAR_SEARCH_EVENT, scrollToTrack } from "@/lib/scroll";
import BottomNav, { type Tab } from "./BottomNav";
import MiniPlayer from "./MiniPlayer";
import RequestsPanel from "./RequestsPanel";
import CommentsTab from "./CommentsTab";
import { useToast } from "./Toast";
import { useT } from "@/lib/i18n";
import LoadingTracks from "./LoadingTracks";

// Yenileyince kaldığın sekmede kal
const TAB_KEY = "istekyap:tab";
const TAB_EVENT = "istekyap:tab-degisti";
let memoryTab: Tab = "playlist";

function readTab(): Tab {
    try {
        const v = sessionStorage.getItem(TAB_KEY);
        if (v === "requests" || v === "playlist" || v === "comments") return v;
    } catch {
        // Tarayıcı depolamayı engelliyorsa bellekteki değeri kullan
    }
    return memoryTab;
}

function writeTab(t: Tab) {
    memoryTab = t;
    try {
        sessionStorage.setItem(TAB_KEY, t);
    } catch {
        // Sessiz geç
    }
    window.dispatchEvent(new Event(TAB_EVENT));
}

function subscribeTab(cb: () => void) {
    window.addEventListener(TAB_EVENT, cb);
    return () => window.removeEventListener(TAB_EVENT, cb);
}

const serverTab = (): Tab => "playlist";

export default function AppTabs({ playlist }: { playlist: ReactNode }) {
    const tab = useSyncExternalStore(subscribeTab, readTab, serverTab);
    const [unread, setUnread] = useState(0);
    const toast = useToast();
    const system = useSystem();
    const t = useT();

    // Playlist kapalıysa istek listesi ve yorumlar kalır
    const showPlaylist = system.playlistVisible;
    const activeTab: Tab = !showPlaylist && tab === "playlist" ? "requests" : tab;
    const tabs: Tab[] = showPlaylist
        ? ["playlist", "requests", "comments"]
        : ["requests", "comments"];
    const tabRef = useRef(activeTab);

    useEffect(() => {
        tabRef.current = activeTab;
    }, [activeTab]);

    const openRequests = useCallback(() => {
        writeTab("requests");
        setUnread(0);
    }, []);

    const handleNew = useCallback(
        (fresh: RequestItem[]) => {
            const text =
                fresh.length === 1
                    ? t("Yeni istek: {name}", { name: fresh[0].name })
                    : t("{n} yeni istek geldi", { n: fresh.length });

            toast.show(text, {
                tone: "info",
                duration: 5000,
                icon: <Bell size={17} className="shrink-0 text-ink" />,
                onClick: openRequests,
            });

            if (tabRef.current !== "requests") setUnread((u) => u + fresh.length);
        },
        [toast, openRequests, t]
    );

    const feed = useRequestFeed(handleNew);
    // "İsteğin onaylandı / şimdi çalıyor / repertuvarımızda yok"
    useMyRequestAlerts(feed.items, system.nowPlaying);

    function openTab(t: Tab) {
        writeTab(t);
        if (t === "requests") setUnread(0);
    }

    // Mini oynatıcıya basınca çalan şarkının olduğu listeye geç ve ona kay
    function jumpToNowPlaying() {
        const id = system.nowPlaying;
        if (!id) return;
        const inRequests = feed.items?.some((r) => r.spotify_id === id) ?? false;
        openTab(showPlaylist && !inRequests ? "playlist" : "requests");
        window.dispatchEvent(new Event(CLEAR_SEARCH_EVENT));
        setTimeout(() => scrollToTrack(id), 150);
    }

    // Durum gelmeden hangi sekmenin görüneceği belli değil: önce playlist görünüp
    // sonra kaybolmasın diye iskelet göster
    if (!system.loaded) {
        return (
            <div className="min-h-0 flex-1 overflow-hidden px-5 pt-4" aria-busy="true">
                <LoadingTracks />
            </div>
        );
    }

    return (
        <>
            {/* Sekmeler açık kalır, böylece playlist aramanı kaybetmezsin ve liste güncellenmeye devam eder */}
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
            <div
                className={
                    activeTab === "comments" ? "flex min-h-0 flex-1 flex-col" : "hidden"
                }
            >
                <CommentsTab active={activeTab === "comments"} />
            </div>

            {system.nowPlaying && (
                <MiniPlayer
                    key={system.nowPlaying}
                    title={system.nowPlayingTitle}
                    cover={system.nowPlayingCover}
                    onClick={jumpToNowPlaying}
                />
            )}

            <BottomNav tab={activeTab} tabs={tabs} unread={unread} onTab={openTab} />
        </>
    );
}