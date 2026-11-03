export type AddedInfo = { label: string; isNew: boolean };

const DAY = 86_400_000;

// Eklenme tarihine göre "Bu hafta", "Geçen hafta", "3 hafta önce", "1 ay önce"...
export function addedInfo(iso?: string | null, now = Date.now()): AddedInfo | null {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    // Eski playlistlerde tarih boş ya da 1970 gelebilir
    if (Number.isNaN(t) || t < Date.UTC(2010, 0, 1)) return null;

    const days = Math.max(0, Math.floor((now - t) / DAY));

    if (days < 7) return { label: "Bu hafta", isNew: true };
    if (days < 14) return { label: "Geçen hafta", isNew: false };
    if (days < 28) return { label: `${Math.floor(days / 7)} hafta önce`, isNew: false };

    const months = Math.floor(days / 30);
    if (months < 12) return { label: `${Math.max(1, months)} ay önce`, isNew: false };

    return { label: `${Math.floor(days / 365)} yıl önce`, isNew: false };
}