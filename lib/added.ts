import type { MsgKey } from "@/lib/i18n-dict";

// label: Türkçe (dashboard) · key + n: ziyaretçi sayfasında seçilen dile çevrilir
export type AddedInfo = { label: string; isNew: boolean; key: MsgKey; n: number };

const DAY = 86_400_000;

const info = (key: MsgKey, n: number, isNew = false): AddedInfo => ({
    label: key.replace("{n}", String(n)),
    isNew,
    key,
    n,
});

// Eklenme tarihine göre "Bu hafta", "Geçen hafta", "3 hafta önce", "1 ay önce"...
export function addedInfo(iso?: string | null, now = Date.now()): AddedInfo | null {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    // Eski playlistlerde tarih boş ya da 1970 gelebilir
    if (Number.isNaN(t) || t < Date.UTC(2010, 0, 1)) return null;

    const days = Math.max(0, Math.floor((now - t) / DAY));

    if (days < 7) return info("Bu hafta", 0, true);
    if (days < 14) return info("Geçen hafta", 0);
    if (days < 28) return info("{n} hafta önce", Math.floor(days / 7));

    const months = Math.floor(days / 30);
    if (months < 12) return info("{n} ay önce", Math.max(1, months));

    return info("{n} yıl önce", Math.floor(days / 365));
}
