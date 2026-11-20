import type { ReactNode } from "react";

// Bütün listelerde (playlist, bu gece, eski istekler, son gece) aynı kart:
//   [kapak]  Şarkı · Sanatçı
//            rozet (Yeni, Çalındı…)          [👍] [👎] [İste] [Sözler]
//            alt bilgi (eklenme tarihi, durum, kaç kez istendi)
// Dar ekranda (ya da uzun İngilizce yazılarla) sığmazsa butonlar rozetin üstüne çıkar,
// hiçbir şey ezilmez.
export default function SongRow({
    as: Tag = "div",
    id,
    cover,
    coverAlt = "",
    name,
    artists,
    playing = false,
    dim = false,
    eager = false,
    badges,
    meta,
    actions,
}: {
    as?: "div" | "li";
    id?: string;
    cover: string | null;
    coverAlt?: string;
    name: string;
    artists: string;
    /** Şu an çalıyor: ad vurgu renginde */
    playing?: boolean;
    /** Reddedilen: soluk ve kapak gri */
    dim?: boolean;
    /** İlk ekranda görünenler hemen, gerisi kaydırdıkça yüklenir */
    eager?: boolean;
    /** Butonların solunda kısa rozetler (Yeni, Çalındı, ×3) */
    badges?: ReactNode;
    /** En alt satır: eklenme tarihi, durum, kaç kez istendi */
    meta?: ReactNode;
    actions?: ReactNode;
}) {
    return (
        <Tag
            id={id}
            // Satırlar arasında çok silik bir çizgi ve biraz boşluk: liste kalabalık görünmesin
            className={`flex items-center gap-3 border-b border-line/60 py-3 last:border-b-0 ${dim ? "opacity-60" : ""}`}
        >
            {cover ? (
                // Spotify'ın küçük kapakları doğrudan yüklenir (Vercel görsel kotası harcanmaz)
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={cover}
                    alt={coverAlt}
                    width={56}
                    height={56}
                    loading={eager ? "eager" : "lazy"}
                    decoding="async"
                    className={`size-14 shrink-0 rounded-[4px] object-cover ${dim ? "grayscale" : ""}`}
                />
            ) : (
                <div className="size-14 shrink-0 rounded-[4px] bg-line" />
            )}

            <div className="min-w-0 flex-1">
                <p className="truncate text-base leading-tight">
                    <span className={playing ? "font-bold text-accent" : "font-semibold text-ink"}>
                        {name}
                    </span>
                    <span className="text-muted"> · {artists}</span>
                </p>

                {(badges || actions) && (
                    // Dar ekranda sığmazsa butonlar üste çıkar, rozet tarihin hemen üstünde kalır
                    <div className="mt-1.5 flex flex-wrap-reverse items-center gap-x-2 gap-y-1.5">
                        {badges && (
                            <div className="flex items-center gap-1.5 whitespace-nowrap text-xs">
                                {badges}
                            </div>
                        )}
                        {actions && (
                            <div className="ml-auto flex shrink-0 items-center gap-1">
                                {actions}
                            </div>
                        )}
                    </div>
                )}

                {meta && (
                    <div className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-xs text-faint">
                        {meta}
                    </div>
                )}
            </div>
        </Tag>
    );
}
