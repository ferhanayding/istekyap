// "Sıradaki şarkıyı siz seçin" anketi: sunucu ve tarayıcının ortak tipleri

export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 4;

// Anket bittikten sonra kazanan ziyaretçiye bu kadar süre gösterilir
export const POLL_RESULT_MS = 2 * 60_000;

export type PollOption = {
    id: string;
    name: string;
    artists: string;
    cover: string | null;
    votes: number;
};

export type Poll = {
    id: string;
    options: PollOption[];
    total: number;
    createdAt: string;
    /** Bittiyse bitiş anı */
    closedAt: string | null;
};

// En çok oy alan; eşitlikte listede önce gelen. Hiç oy yoksa kazanan yok.
export function pollWinner(p: Poll): PollOption | null {
    let best: PollOption | null = null;
    for (const o of p.options) if (o.votes > 0 && (!best || o.votes > best.votes)) best = o;
    return best;
}
