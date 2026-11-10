"use client";

// Beklenmedik bir hata olursa beyaz/bozuk ekran yerine bu görünür
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
    return (
        <main className="flex min-h-dvh items-center justify-center bg-page px-5 text-ink">
            <div className="w-full max-w-sm rounded-[28px] border border-line bg-surface p-6 text-center shadow-2xl">
                <h1 className="text-2xl font-extrabold tracking-tight">Bir şeyler ters gitti</h1>
                <p className="mt-2 text-sm text-muted">
                    Sayfa yüklenirken bir sorun oldu. Tekrar dene, düzelmezse sayfayı yenile.
                </p>
                <button
                    type="button"
                    onClick={reset}
                    className="mt-5 h-11 w-full rounded-full bg-accent text-sm font-extrabold text-on-accent transition active:scale-[0.98]"
                >
                    Tekrar dene
                </button>
            </div>
        </main>
    );
}
