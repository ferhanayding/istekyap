import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import DashboardClient from "../components/dashboard/DashboardClient";

const font = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
    title: "Dashboard · İstekYap",
    robots: { index: false },
};

export default function DashboardPage() {
    return (
        <main className={`${font.className} h-dvh bg-[#100E1D] text-white`}>
            <DashboardClient />
        </main>
    );
}