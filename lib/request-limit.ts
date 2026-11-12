// İstek sınırı: bir cihaz "kaç dakikada kaç istek" atabilir. Dashboard'daki Sistem
// sekmesinden ayarlanır (gece, istek ve oylama kapalıyken). Sunucu da tarayıcı da bunu kullanır.

export const DEFAULT_REQUEST_LIMIT = 1;
export const DEFAULT_REQUEST_WINDOW_MIN = 5;

export const MAX_REQUEST_LIMIT = 50;
export const MAX_REQUEST_WINDOW_MIN = 180;

// Geçerli tam sayı mı (1 ile üst sınır arası)
export function validLimitValue(n: unknown, max: number): n is number {
    return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= max;
}

// Veritabanından gelen değer bozuksa ya da sütun yoksa varsayılana düşer
export function readLimitValue(n: unknown, max: number, fallback: number): number {
    const v = Number(n);
    return validLimitValue(v, max) ? v : fallback;
}

export function limitNote(limit: number, minutes: number): string {
    return `Her cihazdan ${minutes} dakikada en fazla ${limit} istek atılabilir.`;
}
