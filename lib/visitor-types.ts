// Ziyaretçi tarafındaki küçük uçların cevap tipleri (sunucu ve tarayıcı ortak kullanır)

// /api/requests/mine
export type MineResponse = {
    /** Bu cihazın bu gece istediği (ya da katıldığı) şarkılar */
    ids: string[];
    /** Yeni istek için kaç saniye beklemesi gerekiyor (0: hemen isteyebilir) */
    waitSec: number;
};

// /api/last-night
export type LastNightSong = {
    id: string;
    name: string;
    artists: string;
    cover: string | null;
};
export type LastNightResponse = {
    /** Son gecenin son çalınan şarkısının anı */
    date: string | null;
    songs: LastNightSong[];
};

// "Sonraki sahne" yazısının en fazla uzunluğu
export const MAX_NEXT_SHOW = 80;

// Spotify araması en fazla bu kadar karakter (/api/search, istek kutusu, dashboard araması)
export const MAX_SEARCH_LENGTH = 100;

// İsteğe eklenen not ("Kime ya da neden?"): sadece dashboard'da görünür
export const MAX_REQUEST_NOTE = 50;

// Not tek satır: kontrol karakterleri ve satır sonları boşluk olur, fazla boşluk teke iner
export const cleanNote = (s: string) =>
    s
        .replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();

// /api/comments (GET): herkese açık yorumlar
export type PublicComment = {
    id: string;
    rating: number;
    message: string;
    /** Boşsa "Anonim" görünür */
    name: string;
    createdAt: string;
};
export type CommentsResponse = {
    items: PublicComment[];
    /** Bütün puanlar (sadece yıldız verenler dahil) */
    count: number;
    average: number;
};

// Yorum gönderilince açık "Yorumlar" sekmesi hemen tazelensin
export const COMMENT_SENT_EVENT = "yorum:gonderildi";

// Yorumda link olmasın (reklam/spam). "güzeldi.Az önce" gibi boşluksuz cümleler takılmasın diye
// sadece belirgin adresler aranır.
const LINK = /(https?:\/\/|www\.)|\b[\p{L}\p{N}-]+\.(com|net|org|info|io|ru|xyz|link|ly|site|online|shop)\b/iu;
export const hasLink = (s: string) => LINK.test(s);
