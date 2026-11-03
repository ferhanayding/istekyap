import { Bricolage_Grotesque } from "next/font/google";
import Header from "./components/header";
import RequestButton from "./components/RequestButton";
import AppTabs from "./components/AppTabs";
import PlaylistSection from "./components/PlaylistSection";
import { SystemProvider } from "@/lib/system-context";

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
        <div className="pointer-events-none absolute -right-32 -top-32 size-80 rounded-full bg-[#805CFF]/10 blur-[100px]" />
        <div className="pointer-events-none absolute -left-32 top-[500px] size-64 rounded-full bg-[#00D1B2]/[0.06] blur-[100px]" />
        <SystemProvider>


          <Header />
          <RequestButton />
          <AppTabs playlist={<PlaylistSection />} />
        </SystemProvider>
      </div>
    </main>
  );
}