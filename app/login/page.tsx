import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
    title: "Grup girişi · İstekYap",
    robots: { index: false },
};

export default function GirisPage() {
    return (
        <main
            className="flex min-h-dvh items-center justify-center bg-[#100E1D] px-5 text-white"
        >
            <div className="w-full max-w-sm rounded-[28px] border border-white/[0.06] bg-[#19162D] p-6 shadow-2xl">
                <h1 className="text-[32px] font-extrabold leading-none tracking-[-1.5px]">
                    İstek<span className="text-[#9B80FF]">Yap.</span>
                </h1>
                <p className="mb-6 mt-2 text-sm text-[#928BA8]">
                    Grup girişi. Sadece grup üyeleri girebilir.
                </p>

                <LoginForm />

                <Link
                    href="/"
                    className="mt-5 block text-center text-xs text-[#817A98] hover:text-white"
                >
                    Siteye dön
                </Link>
            </div>
        </main>
    );
}