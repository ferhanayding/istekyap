// Aramada engellenecek müstehcen ve küfürlü kelimeler.
// Hem tarayıcıda (yazarken) hem sunucuda (/api/search) kullanılır.

export const BLOCKED_MESSAGE = "Bu kelimeyle arama yapılamaz.";

// "ı" harfi bilerek korunur: "sıkıntı" engellenmesin, "sikiş" engellensin
function fold(s: string): string {
    return s
        .toLocaleLowerCase("tr")
        .normalize("NFD")
        .replace(/\p{M}/gu, "");
}

// Rakam ve işaretle gizlenen yazımlar: s1kt1r, p0rn0, @mk
const LEET: Record<string, string> = {
    "0": "o",
    "1": "i",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",
    "@": "a",
    $: "s",
};

const collapse = (s: string) => s.replace(/(.)\1+/g, "$1");

// Tam eşleşen kelimeler (kısa ve başka kelimelerle karışabilecekler)
const EXACT = new Set([
    "sik",
    "sikim",
    "sikime",
    "sikmek",
    "amk",
    "aq",
    "amq",
    "bok",
    "boku",
    "boktan",
    "xxx",
    "bdsm",
    "ibne",
    "pust",
    "gavat",
    "kahpe",
    "yavsak",
    "kaltak",
    "surtuk",
    "fahise",
    "orgazm",
    "shit",
    "cunt",
    "pussy",
    "asshole",
]);

// Önek eşleşmesi: türevlerini de yakalar (sikiş, siktir, orospunun, pornosu...)
const PREFIX = [
    "sikt",
    "sikis",
    "sikik",
    "sikey",
    "siker",
    "sikec",
    "sikm",
    "sex",
    "seks",
    "porn",
    "orospu",
    "oruspu",
    "amcik",
    "amcık",
    "amına",
    "amınak",
    "aminak",
    "yarrak",
    "pezevenk",
    "mastur",
    "ejakul",
    "hentai",
    "fuck",
    "motherf",
    "bitch",
    "xvideos",
    "xnxx",
];

// Önek listesine takılan ama masum olan kelimeler
const ALLOW = ["seksen", "seksek"];

// Aksanlı yazımı engellenenler: ASCII yazımı başka kelimeyle karışır (piç/pic, göt/got).
// "götür" gibi masum kelimeler yakalanmasın diye tam eşleşme aranır.
const DIACRITIC = new Set([
    "piç",
    "piçi",
    "piçler",
    "göt",
    "götü",
    "götün",
    "götünü",
    "götüne",
    "götler",
    "götveren",
]);

const PREFIX_FOLDED = PREFIX.map(fold);
const PREFIX_COLLAPSED = PREFIX_FOLDED.map(collapse);

// "book" → "bok" olmasın diye bu kelimeler uzatılmış yazımda aranmaz
const NO_COLLAPSE = new Set(["bok", "boku", "boktan"]);

function matches(token: string): boolean {
    if (!token) return false;
    // Sadece "siiikiiiş" gibi 3+ tekrarlı harf varsa sadeleştir
    const c = /(.)\1\1/.test(token) ? collapse(token) : token;
    if (EXACT.has(token)) return true;
    if (c !== token && EXACT.has(c) && !NO_COLLAPSE.has(c)) return true;
    if (ALLOW.some((a) => token.startsWith(a))) return false;
    return (
        PREFIX_FOLDED.some((p) => token.startsWith(p)) ||
        PREFIX_COLLAPSED.some((p) => c.startsWith(p))
    );
}

// "s i k i ş" gibi harfleri ayırılmış yazımları birleştir
function joinSpaced(tokens: string[]): string[] {
    const out: string[] = [];
    let run = "";
    for (const t of tokens) {
        if (t.length === 1) {
            run += t;
            continue;
        }
        if (run.length >= 3) out.push(run);
        else if (run) out.push(...run.split(""));
        run = "";
        out.push(t);
    }
    if (run.length >= 3) out.push(run);
    else if (run) out.push(...run.split(""));
    return out;
}

function tokensOf(text: string, leet: boolean): string[] {
    let s = fold(text);
    if (leet) s = s.replace(/[013457@$]/g, (ch) => LEET[ch] ?? ch);
    const raw = s.split(/[^a-zı0-9]+/).filter(Boolean);
    return [...raw, ...joinSpaced(raw)];
}

export function isBlocked(text: string): boolean {
    if (!text || !text.trim()) return false;

    // Aksanlı yazımlar (piç, göt)
    const accent = text
        .toLocaleLowerCase("tr")
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean);
    if (accent.some((t) => DIACRITIC.has(t))) return true;

    return (
        tokensOf(text, false).some(matches) || tokensOf(text, true).some(matches)
    );
}
