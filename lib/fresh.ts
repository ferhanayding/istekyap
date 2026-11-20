// Sunucu cevabının veritabanından okunduğu an (ms). Vercel CDN birkaç saniyelik kopya
// verebilir: sonra gelen ama daha eski olan bir cevap, canlı sinyalle gelen yenisinin
// üstüne yazılmasın (örn. "Çal"dan sonra liste bir dakika eski hâline dönmesin).
export const READ_AT_HEADER = "x-read-at";

export const readAtHeader = (readAt: number): Record<string, string> => ({
    [READ_AT_HEADER]: String(readAt),
});

// Her liste kendi bekçisini tutar: şimdiye kadar uygulanandan eski cevap reddedilir.
// Başlık yoksa (yayın sırasında eski sunucu) cevap uygulanır.
export function newestOnly(): (res: Response) => boolean {
    let last = 0;
    return (res) => {
        const at = Number(res.headers.get(READ_AT_HEADER));
        if (!Number.isFinite(at) || at <= 0) return true;
        if (at < last) return false;
        last = at;
        return true;
    };
}
