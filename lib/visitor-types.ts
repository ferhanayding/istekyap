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
