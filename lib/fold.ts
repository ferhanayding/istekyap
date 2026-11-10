// Arama için: küçük harfe çevir, Türkçe karakterleri ve aksanları sadeleştir
export const fold = (s: string) =>
    s
        .toLocaleLowerCase("tr")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/ı/g, "i");
