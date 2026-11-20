// Engellenecek müstehcen ve küfürlü kelimeler (Türkçe, Azerbaycanca, İngilizce).
// isBlocked: şarkı araması ve şarkı adları (/api/search, istekler, öneriler, eski istekler).
// isBlockedComment: yorumlar; aynı liste + şarkı adlarında masum geçen kelimeler (COMMENT_*).
// Hem tarayıcıda (yazarken) hem sunucuda kullanılır.

export const BLOCKED_MESSAGE = "Bu kelimeyle arama yapılamaz.";

// "ı" harfi bilerek korunur: "sıkıntı" engellenmesin, "sikiş" engellensin.
// Azerbaycanca "ə" → "e" (qəhbə → qehbe)
function fold(s: string): string {
    return s
        .toLocaleLowerCase("tr")
        .replace(/ə/g, "e")
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
    // "am" sadece tek başına: "ama", "aman", "amazing" engellenmesin
    // (İngilizce "I am", "Am I Wrong" de serbest: innocentAm)
    "am",
    "amı",
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
    "twat",
    // Çift harfli olanlar önek olamaz: sadeleşince "night", "Nigar" de yakalanırdı
    "nigger",
    "niggers",
    "nigga",
    "niggas",
    "faggot",
    "faggots",
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
    "memeler",
    "pipi",
    "tasak",
    "yarak",
    "amini",
    "amını",
    "amcig",
    "sikici",
    "orospunun",
    "sikicisi",
    "gotveren",
    "kancık",
    "kancik",
    "whore",
    "slut",
    // Azerbaycanca (ə → e yazılır)
    "sikd",
    "amcıq",
    "amciq",
    "qehbe",
    "kahbe",
    "peyser",
    "qancıq",
    "qanciq",
    "dalbay",
    "dolbay",
    "dolboy",
    "blyat",
    "blyad",
];

// Sadece yorumlarda: şarkı ve grup adlarında masum geçerler ("Moby Dick", "Cock Robin",
// "Suka Suka", "Bastards of Young"), o yüzden şarkı aramasını engellemezler
const COMMENT_EXACT = new Set([
    "dick",
    "cock",
    // Azerbaycanca
    "pox",
    "poxu",
    "suka",
]);
const COMMENT_PREFIX = ["bastard"];

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
    "götünden",
    "taşak",
    "taşşak",
]);

// Aksanlı önekler: "götsün", "götüme", "çükümü"... ama "götür", "götürmek" masum
const ACCENT_PREFIX = ["göt", "çük"];
const ACCENT_ALLOW = ["götür"];
const accentPrefix = (t: string) =>
    ACCENT_PREFIX.some((p) => t.startsWith(p)) && !ACCENT_ALLOW.some((a) => t.startsWith(a));

const PREFIX_FOLDED = PREFIX.map(fold);
const PREFIX_COLLAPSED = PREFIX_FOLDED.map(collapse);
const COMMENT_PREFIX_FOLDED = COMMENT_PREFIX.map(fold);

// "book" → "bok" olmasın diye bu kelimeler uzatılmış yazımda aranmaz
const NO_COLLAPSE = new Set(["bok", "boku", "boktan"]);

function matches(token: string, comment: boolean): boolean {
    if (!token) return false;
    // Sadece "siiikiiiş" gibi 3+ tekrarlı harf varsa sadeleştir
    const c = /(.)\1\1/.test(token) ? collapse(token) : token;
    if (EXACT.has(token)) return true;
    if (c !== token && EXACT.has(c) && !NO_COLLAPSE.has(c)) return true;
    if (comment) {
        if (COMMENT_EXACT.has(token) || COMMENT_EXACT.has(c)) return true;
        if (COMMENT_PREFIX_FOLDED.some((p) => token.startsWith(p) || c.startsWith(p))) {
            return true;
        }
    }
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

// İngilizce "I am", "Am I Wrong", "Where Am I" ve "8 am" masum: yanındaki kelimeye bakılır
// ("I" Türkçe küçültmede "ı" olur)
const innocentAm = (tokens: string[], i: number) =>
    tokens[i] === "am" &&
    (/^(i|ı|\d+)$/.test(tokens[i - 1] ?? "") || /^(i|ı)$/.test(tokens[i + 1] ?? ""));

function blockedIn(tokens: string[], comment: boolean): boolean {
    return tokens.some((tok, i) => !innocentAm(tokens, i) && matches(tok, comment));
}

// Kelimeler ve harfleri ayrılmış yazımların birleşmiş hâli, iki ayrı liste:
// yanındaki kelimeye bakılırken listeler birbirine karışmasın
function tokenLists(text: string, leet: boolean): string[][] {
    let s = fold(text);
    if (leet) s = s.replace(/[013457@$]/g, (ch) => LEET[ch] ?? ch);
    const raw = s.split(/[^a-zı0-9]+/).filter(Boolean);
    return [raw, joinSpaced(raw)];
}

// Şarkı araması ve şarkı adları
export function isBlocked(text: string): boolean {
    return check(text, false);
}

// Yorum ve yorumdaki isim: şarkı adlarında masum geçen kelimeler de engellenir
export function isBlockedComment(text: string): boolean {
    return check(text, true);
}

function check(text: string, comment: boolean): boolean {
    if (!text || !text.trim()) return false;

    // Aksanlı yazımlar (piç, göt)
    const accent = text
        .toLocaleLowerCase("tr")
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean);
    if (accent.some((t) => DIACRITIC.has(t) || accentPrefix(t))) return true;

    return [false, true].some((leet) =>
        tokenLists(text, leet).some((tokens) => blockedIn(tokens, comment))
    );
}
