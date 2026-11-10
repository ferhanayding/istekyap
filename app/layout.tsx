import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
