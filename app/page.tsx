import { Bricolage_Grotesque } from "next/font/google";
import Header from "./components/header";
import RequestButton from "./components/RequestButton";
import AppTabs from "./components/AppTabs";
import PlaylistSection from "./components/PlaylistSection";
import { SystemProvider } from "@/lib/system-context";
import { ToastProvider } from "./components/Toast";
import { VotesProvider } from "@/lib/votes-context";
import { LyricsProvider } from "./components/LyricsSheet";
const font = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
});

export default function Home() {
  return (
    <main
      className={`${font.className} flex h-dvh items-center justify-center bg-[#100E1D] text-white sm:p-6`}
    >
      <div className="relative flex h-full w-full max-w-[480px] flex-col overflow-hidden bg-[#141124] sm:max-h-[860px] sm:rounded-[36px] sm:border sm:border-white/[0.08] sm:shadow-2xl">
        {/* Arka plan süsleri */}
        {/* Spotify tarzı üst renk geçişi */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-[#4A38B0]/55 via-[#2A1F66]/25 to-transparent" />
        <SystemProvider>
          <ToastProvider>
            <VotesProvider>
              <LyricsProvider>
                <Header />
                <RequestButton />
                <AppTabs playlist={<PlaylistSection />} />
              </LyricsProvider>
            </VotesProvider>
          </ToastProvider>
        </SystemProvider>
      </div>
    </main>
  );
}