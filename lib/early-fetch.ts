// Sayfanın ilk verileri, JS dosyası yüklenir yüklenmez istenmeye başlar:
// React'in sayfayı hazırlamasını (hydration) beklemez, o süre kazanılır.
// Her adres için erken istek bir kez kullanılır, sonraki okumalar normal fetch'tir.

const started = new Map<string, Promise<Response>>();

export function startEarly(url: string) {
    if (typeof window === "undefined" || started.has(url)) return;
    const p = fetch(url, { cache: "no-store" });
    p.catch(() => {}); // kullanılmadan hata verirse konsolu kirletmesin
    started.set(url, p);
}

export function fetchFirst(url: string): Promise<Response> {
    const p = started.get(url);
    if (p) {
        started.delete(url);
        return p;
    }
    return fetch(url, { cache: "no-store" });
}
