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
            className="flex min-h-dvh items-center justify-center bg-page px-5 text-ink"
        >
            <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6">
                <h1 className="text-[32px] font-extrabold leading-none tracking-[-1.5px]">
                    İstekYap<span className="text-accent">.</span>
                </h1>
                <p className="mb-6 mt-2 text-sm text-muted">
                    Grup girişi. Sadece grup üyeleri girebilir.
                </p>

                <LoginForm />

                <Link
                    href="/"
                    className="mt-5 block text-center text-xs text-faint hover:text-ink"
                >
                    Siteye dön
                </Link>
            </div>
        </main>
    );
}