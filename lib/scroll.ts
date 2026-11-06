export const CLEAR_SEARCH_EVENT = "istek:aramayi-temizle";

// Çalan şarkının satırına kayar (playlist ya da istek listesi, hangisindeyse)
export function scrollToTrack(id: string) {
    const el =
        document.getElementById(`track-${id}`) ??
        document.getElementById(`req-${id}`);
    const box = el?.closest<HTMLElement>("[data-scroll-list]");
    if (!el || !box) return;

    const b = box.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const top =
        box.scrollTop + (r.top - b.top) - (box.clientHeight - r.height) / 2;
    box.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}