import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { preconnect } from "react-dom";
import "./globals.css";

// Sitenin tek yazı tipi: bir kez tanımlanır, bütün sayfalar kullanır
const font = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const DESCRIPTION =
  "LƏYSAN konserinde şarkı iste, sözlerini oku, çalınan şarkıları değerlendir.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.istekyap.live"),
  title: "İstekYap · LƏYSAN",
  description: DESCRIPTION,
  // WhatsApp / Instagram'da link paylaşılınca görünen önizleme
  openGraph: {
    title: "İstekYap · LƏYSAN",
    description: DESCRIPTION,
    url: "/",
    siteName: "İstekYap",
    locale: "tr_TR",
    type: "website",
  },
};

// Telefonun üst çubuğu sitenin rengini alsın
export const viewport: Viewport = {
  themeColor: "#100E1D",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Şarkı kapakları ve canlı bağlantı için bağlantıyı erkenden aç
  preconnect("https://i.scdn.co");
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    preconnect(process.env.NEXT_PUBLIC_SUPABASE_URL);
  }

  return (
    <html lang="tr" className="h-full antialiased">
      <body
        className={`${font.className} flex min-h-full flex-col bg-[#100E1D] text-white`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
