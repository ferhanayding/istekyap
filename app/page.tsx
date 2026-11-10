import Header from "./components/header";
import RequestButton from "./components/RequestButton";
import ClosedBanner from "./components/ClosedBanner";
import AppTabs from "./components/AppTabs";
import PlaylistSection from "./components/PlaylistSection";
import { SystemProvider } from "@/lib/system-context";
import { ToastProvider } from "./components/Toast";
import { VotesProvider } from "@/lib/votes-context";
import { LyricsProvider } from "./components/LyricsSheet";
import { getAppFlags } from "@/lib/app-flags";

export default async function Home() {
  // İstek/oylama/playlist anahtarları sayfanın hazır HTML'ine gömülür (lib/app-flags):
  // sayfa ilk anda doğru hâliyle açılır. Okunamazsa tarayıcı /api/state ile öğrenir.
  const flags = await getAppFlags().catch((e) => {
    console.error(e);
    return null;
  });

  return (
    <main className="flex h-dvh items-center justify-center bg-page text-ink sm:bg-[#0b0a09] sm:p-6">
      <div className="relative flex h-full w-full max-w-[480px] flex-col overflow-hidden bg-page sm:max-h-[860px] sm:rounded-3xl sm:border sm:border-line">
        <SystemProvider initial={flags}>
          <ToastProvider>
            <VotesProvider>
              <LyricsProvider>
                <ClosedBanner />
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
