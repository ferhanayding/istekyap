// Ziyaretçinin gördüğü "Eski istekler": bugüne kadar istenen her şarkı bir satır
export type HistorySong = {
    spotify_id: string;
    name: string;
    artists: string;
    cover: string | null;
    /** Toplam kaç kez istendi (katılmalar dahil, reddedilenler hariç) */
    requests: number;
    /** Kaç kez çalındı */
    plays: number;
    /** Toplam beğeni (beğenmeme sayısı ziyaretçiye gösterilmez) */
    likes: number;
    lastRequested: string;
};
