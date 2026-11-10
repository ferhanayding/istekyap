import type { ReactNode } from "react";

// Bütün listelerde (playlist, bu gece, eski istekler) aynı sıkı satır:
//   [kapak]  Şarkı · Sanatçı
//            bilgi (rozet, tarih)            [butonlar]
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
    meta?: ReactNode;
    actions?: ReactNode;
}) {
    return (
        <Tag id={id} className={`flex items-center gap-3 py-1.5 ${dim ? "opacity-60" : ""}`}>
            {cover ? (
                // Spotify'ın küçük kapakları doğrudan yüklenir (Vercel görsel kotası harcanmaz)
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={cover}
                    alt={coverAlt}
                    width={44}
                    height={44}
                    loading={eager ? "eager" : "lazy"}
                    decoding="async"
                    className={`size-11 shrink-0 rounded-[4px] object-cover ${dim ? "grayscale" : ""}`}
                />
            ) : (
                <div className="size-11 shrink-0 rounded-[4px] bg-line" />
            )}

            <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] leading-tight">
                    <span className={playing ? "font-bold text-accent" : "font-semibold text-ink"}>
                        {name}
                    </span>
                    <span className="text-muted"> · {artists}</span>
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-xs text-faint">
                        {meta}
                    </div>
                    {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
                </div>
            </div>
        </Tag>
    );
}
