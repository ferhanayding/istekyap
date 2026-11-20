"use client";

import {
    createContext,
    Fragment,
    useContext,
    useEffect,
    useMemo,
    useSyncExternalStore,
    type ReactNode,
} from "react";
import { DICT, SERVER_PATTERNS, type MsgKey } from "./i18n-dict";

// Ziyaretçi sayfasının dili: Türkçe (varsayılan), İngilizce, Azerbaycanca.
// Metinlerin Türkçesi aynı zamanda anahtarıdır (lib/i18n-dict). Dashboard'da sağlayıcı yok,
// orada her şey Türkçe kalır.

export type Lang = "tr" | "en" | "az";

export const LANGS: { code: Lang; short: string; label: string; locale: string }[] = [
    { code: "tr", short: "TR", label: "Türkçe", locale: "tr-TR" },
    { code: "en", short: "EN", label: "English", locale: "en-GB" },
    { code: "az", short: "AZ", label: "Azərbaycanca", locale: "az-Latn-AZ" },
];

const STORE_KEY = "istekyap:dil";
const CHANGE_EVENT = "istekyap:dil-degisti";
let memoryLang: Lang = "tr";

const isLang = (v: unknown): v is Lang => v === "tr" || v === "en" || v === "az";

// Seçilen dil telefonda kalır, bir dahaki açılışta da o dilde gelir
export function readStoredLang(): Lang {
    try {
        const v = localStorage.getItem(STORE_KEY);
        if (isLang(v)) return v;
    } catch {
        // Tarayıcı depolamayı engelliyorsa bellekteki seçim
    }
    return memoryLang;
}

export function setLang(lang: Lang) {
    memoryLang = lang;
    try {
        localStorage.setItem(STORE_KEY, lang);
    } catch {
        // Sessiz geç: bu oturumda yine de değişir
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(cb: () => void) {
    window.addEventListener(CHANGE_EVENT, cb);
    window.addEventListener("storage", cb); // başka sekmede değişirse
    return () => {
        window.removeEventListener(CHANGE_EVENT, cb);
        window.removeEventListener("storage", cb);
    };
}

type Vars = Record<string, string | number>;

const fill = (s: string, vars?: Vars) =>
    vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;

// Ham kalıp (yer tutucular dolmadan): İngilizcede tekil/çoğul, n'ye göre seçilir
function template(lang: Lang, key: MsgKey, vars?: Vars): string {
    if (lang === "tr") return key;
    const entry = DICT[key][lang];
    if (typeof entry === "string") return entry;
    return vars?.n === 1 ? entry[0] : entry[1];
}

export function translate(lang: Lang, key: MsgKey, vars?: Vars): string {
    return fill(template(lang, key, vars), vars);
}

// Sunucudan gelen hata mesajları Türkçe gelir: sözlükte varsa çevrilir, yoksa olduğu gibi
export function translateServer(lang: Lang, text: string): string {
    if (lang === "tr" || !text) return text;
    if (Object.prototype.hasOwnProperty.call(DICT, text)) {
        return translate(lang, text as MsgKey);
    }
    for (const p of SERVER_PATTERNS) {
        const m = p.re.exec(text);
        if (m) return translate(lang, p.key, p.vars(m));
    }
    return text;
}

const LangContext = createContext<Lang>("tr");

export function LangProvider({ children }: { children: ReactNode }) {
    // Sunucudaki hazır sayfa Türkçe; telefonda başka dil seçildiyse açılır açılmaz ona döner
    const lang = useSyncExternalStore(subscribe, readStoredLang, () => "tr" as Lang);

    useEffect(() => {
        document.documentElement.lang = lang;
    }, [lang]);

    return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

export type T = ((key: MsgKey, vars?: Vars) => string) & {
    lang: Lang;
    /** Tarih/saat biçimi için (Intl) */
    locale: string;
    /** Sunucudan gelen Türkçe mesajı çevir */
    server: (text: string) => string;
    /** Metnin içine bileşen yerleştir: "{time} sonra" → ["", <b>4:32</b>, " sonra"] */
    rich: (key: MsgKey, nodes: Record<string, ReactNode>) => ReactNode;
};

export function useT(): T {
    const lang = useLang();
    return useMemo(() => {
        const t = (key: MsgKey, vars?: Vars) => translate(lang, key, vars);
        const locale = LANGS.find((l) => l.code === lang)?.locale ?? "tr-TR";
        const rich = (key: MsgKey, nodes: Record<string, ReactNode>) =>
            template(lang, key)
                .split(/\{(\w+)\}/)
                .map((part, i) => (
                    <Fragment key={i}>{i % 2 ? (nodes[part] ?? `{${part}}`) : part}</Fragment>
                ));
        return Object.assign(t, {
            lang,
            locale,
            server: (text: string) => translateServer(lang, text),
            rich,
        });
    }, [lang]);
}

// "az önce", "5 dakika önce", "dün"... (Intl'in Azerbaycancası her tarayıcıda yok)
export function timeAgo(t: T, iso: string, now: number): string {
    const sec = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
    if (sec < 60) return t("az önce");
    const min = Math.round(sec / 60);
    if (min < 60) return t("{n} dakika önce", { n: min });
    const h = Math.round(min / 60);
    if (h < 24) return t("{n} saat önce", { n: h });
    const d = Math.round(h / 24);
    if (d === 1) return t("dün");
    return t("{n} gün önce", { n: d });
}

// "18 Kasım Çarşamba" gibi gün adı. Tarayıcıların çoğunda Intl'in Azerbaycancası yok
// ("M11 18, Wed" çıkıyor), o yüzden Azerbaycanca ay ve gün adları burada.
const AZ_MONTHS = [
    "yanvar", "fevral", "mart", "aprel", "may", "iyun",
    "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr",
];
const AZ_DAYS = [
    "bazar", "bazar ertəsi", "çərşənbə axşamı", "çərşənbə", "cümə axşamı", "cümə", "şənbə",
];
const EN_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatDay(t: T, iso: string, timeZone = "Europe/Istanbul"): string {
    const date = new Date(iso);
    if (t.lang !== "az") {
        return new Intl.DateTimeFormat(t.locale, {
            timeZone,
            day: "numeric",
            month: "long",
            weekday: "long",
        }).format(date);
    }
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        day: "numeric",
        month: "numeric",
        weekday: "short",
    }).formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((p) => p.type === type)?.value ?? "";
    const day = AZ_DAYS[EN_DAYS.indexOf(get("weekday"))] ?? "";
    return `${get("day")} ${AZ_MONTHS[Number(get("month")) - 1] ?? ""}, ${day}`;
}
