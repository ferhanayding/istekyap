"use client";

// Beklenmedik bir hata olursa beyaz/bozuk ekran yerine bu görünür
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
    return (
        <main className="flex min-h-dvh items-center justify-center bg-[#100E1D] px-5 text-white">
            <div className="w-full max-w-sm rounded-[28px] border border-white/[0.06] bg-[#19162D] p-6 text-center shadow-2xl">
                <h1 className="text-2xl font-extrabold tracking-tight">Bir şeyler ters gitti</h1>
                <p className="mt-2 text-sm text-[#B3B3B3]">
                    Sayfa yüklenirken bir sorun oldu. Tekrar dene, düzelmezse sayfayı yenile.
                </p>
                <button
                    type="button"
                    onClick={reset}
                    className="mt-5 h-11 w-full rounded-full bg-[#1ED760] text-sm font-extrabold text-black transition active:scale-[0.98]"
                >
                    Tekrar dene
                </button>
            </div>
        </main>
    );
}
