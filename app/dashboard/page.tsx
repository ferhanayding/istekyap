import type { Metadata } from "next";
import DashboardClient from "../components/dashboard/DashboardClient";

export const metadata: Metadata = {
    title: "Dashboard · İstekYap",
    robots: { index: false },
};

export default function DashboardPage() {
    return (
        <main className="h-dvh bg-[#100E1D] text-white">
            <DashboardClient />
        </main>
    );
}