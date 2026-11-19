"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Maximize2, Minimize2, Pencil, Plus, StickyNote, Trash2, X } from "lucide-react";
import { MAX_NOTE, songKey, type SongNote } from "@/lib/song-notes";
import { useToast } from "../Toast";

// Şarkı notları (sadece dashboard): solo akorları, başlangıç tonu vb.
// "Sözler" butonunun yanındaki + ile eklenir; sözler açılınca üstte sabit durur.

type Song = { name: string; artists: string };

type Ctx = {
    get: (s: Song) => SongNote | undefined;
    edit: (s: Song) => void;
};
const NotesContext = createContext<Ctx>({ get: () => undefined, edit: () => {} });
const useNotes = () => useContext(NotesContext);

const POLL_MS = 60_000;

export function NotesProvider({ children }: { children: ReactNode }) {
    const [notes, setNotes] = useState<Map<string, SongNote>>(new Map());
    const [needSql, setNeedSql] = useState(false);
    const [editing, setEditing] = useState<Song | null>(null);
    const router = useRouter();
    const toast = useToast();

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/dashboard/notes", { cache: "no-store" });
            if (res.status === 401) {
                router.replace("/login");
                return;
            }
            const data = (await res.json()) as { notes?: SongNote[]; needSql?: boolean } | null;
            if (!res.ok || !data || !Array.isArray(data.notes)) return;
            setNeedSql(!!data.needSql);
            setNotes(new Map(data.notes.map((n) => [n.key, n])));
        } catch {
            // Sessiz geç: bir sonraki turda tekrar dener
        }
    }, [router]);

    // Diğer grup üyesinin eklediği not da gelsin
    useEffect(() => {
        const first = setTimeout(() => void load(), 0);
        const timer = setInterval(() => {
            if (!document.hidden) void load();
        }, POLL_MS);
        const onVisible = () => {
            if (!document.hidden) void load();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            clearTimeout(first);
            clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [load]);

    const get = useCallback((s: Song) => notes.get(songKey(s.name, s.artists)), [notes]);
    const edit = useCallback(
        (s: Song) => {
            if (needSql) {
                toast.error("Önce Supabase'de supabase/notlar.sql dosyasını çalıştır.");
                return;
            }
            setEditing(s);
        },
        [needSql, toast]
    );

    const save = useCallback(
        async (s: Song, body: string): Promise<boolean> => {
            try {
                const res = await fetch("/api/dashboard/notes", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...s, body }),
                });
                if (res.status === 401) {
                    router.replace("/login");
                    return false;
                }
                const data = (await res.json().catch(() => null)) as {
                    note?: SongNote;
                    error?: string;
                } | null;
                if (!res.ok || !data?.note) {
                    toast.error(data?.error ?? "Not kaydedilemedi.");
                    return false;
                }
                const note = data.note;
                setNotes((m) => new Map(m).set(note.key, note));
                return true;
            } catch {
                toast.error("Not kaydedilemedi.");
                return false;
            }
        },
        [router, toast]
    );

    const remove = useCallback(
        async (s: Song): Promise<boolean> => {
            try {
                const params = new URLSearchParams(s);
                const res = await fetch(`/api/dashboard/notes?${params}`, { method: "DELETE" });
                if (!res.ok) {
                    const data = (await res.json().catch(() => null)) as { error?: string } | null;
                    toast.error(data?.error ?? "Not silinemedi.");
                    return false;
                }
                const key = songKey(s.name, s.artists);
                setNotes((m) => {
                    const next = new Map(m);
                    next.delete(key);
                    return next;
                });
                return true;
            } catch {
                toast.error("Not silinemedi.");
                return false;
            }
        },
        [toast]
    );

    const value = useMemo<Ctx>(() => ({ get, edit }), [get, edit]);

    return (
        <NotesContext.Provider value={value}>
            {children}
            {editing && (
                <NoteEditor
                    key={songKey(editing.name, editing.artists)}
                    song={editing}
                    initial={get(editing)?.body ?? ""}
                    onSave={save}
                    onRemove={remove}
                    onClose={() => setEditing(null)}
                />
            )}
        </NotesContext.Provider>
    );
}

// "Sözler" butonunun yanında: not yoksa +, varsa dolu not simgesi. İkisi de düzenleyiciyi açar.
export function NoteButton({ name, artists }: Song) {
    const { get, edit } = useNotes();
    const has = !!get({ name, artists });
    return (
        <button
            type="button"
            onClick={() => edit({ name, artists })}
            aria-label={has ? `${name} notunu düzenle` : `${name} şarkısına not ekle`}
            title={has ? "Notu düzenle" : "Not ekle"}
            className={`relative flex size-7 shrink-0 items-center justify-center rounded-full transition after:absolute after:-inset-1.5 after:content-[''] active:scale-95 ${
                has ? "bg-accent text-on-accent" : "bg-raised text-muted hover:bg-line hover:text-ink"
            }`}
        >
            {has ? <StickyNote size={14} /> : <Plus size={15} strokeWidth={2.75} />}
        </button>
    );
}

// Not ekleme / düzenleme penceresi (sözler açıkken de üstünde açılır)
function NoteEditor({
    song,
    initial,
    onSave,
    onRemove,
    onClose,
}: {
    song: Song;
    initial: string;
    onSave: (s: Song, body: string) => Promise<boolean>;
    onRemove: (s: Song) => Promise<boolean>;
    onClose: () => void;
}) {
    const [text, setText] = useState(initial);
    const [busy, setBusy] = useState(false);
    const toast = useToast();
    const ref = useRef<HTMLTextAreaElement>(null);
    const tooLong = text.length > MAX_NOTE;
    const changed = text.trim() !== initial.trim();

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !busy) {
                e.stopPropagation();
                onClose();
            }
        };
        // Sözler penceresinin Esc'inden önce yakalansın: sadece düzenleyici kapansın
        document.addEventListener("keydown", onKey, true);
        return () => document.removeEventListener("keydown", onKey, true);
    }, [busy, onClose]);

    async function submit() {
        if (busy || tooLong) return;
        setBusy(true);
        // Boş kaydetmek notu siler
        const ok = text.trim()
            ? await onSave(song, text)
            : initial
              ? await onRemove(song)
              : true;
        setBusy(false);
        if (ok) {
            if (text.trim()) toast.success("Not kaydedildi.");
            else if (initial) toast.info("Not silindi.");
            onClose();
        }
    }

    async function del() {
        if (!window.confirm(`"${song.name}" notu silinsin mi?`)) return;
        setBusy(true);
        const ok = await onRemove(song);
        setBusy(false);
        if (ok) {
            toast.info("Not silindi.");
            onClose();
        }
    }

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`${song.name} notu`}
            className="fixed inset-0 z-[65] flex items-end justify-center bg-black/70 sm:items-center sm:p-6"
            onClick={() => !busy && onClose()}
        >
            <form
                onClick={(e) => e.stopPropagation()}
                onSubmit={(e) => {
                    e.preventDefault();
                    void submit();
                }}
                className="flex w-full max-w-[560px] flex-col gap-3 rounded-t-3xl border border-line bg-page p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
            >
                <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                        <StickyNote size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-extrabold text-ink">{song.name}</p>
                        <p className="truncate text-xs text-muted">{song.artists}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        aria-label="Kapat"
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-raised text-ink transition hover:bg-line"
                    >
                        <X size={18} />
                    </button>
                </div>

                <textarea
                    ref={ref}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        // Bilgisayarda Ctrl+Enter ile kaydet
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            void submit();
                        }
                    }}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                    rows={7}
                    aria-label="Not"
                    placeholder={"Örn.\nSolo: Am  F  C  G  x2\nG ile başlıyor, sol el Am G"}
                    className="w-full resize-y rounded-xl bg-surface p-3 font-mono text-base font-semibold leading-relaxed text-ink outline-none ring-1 ring-line placeholder:font-normal placeholder:text-faint focus:ring-accent"
                />
                <p className={`-mt-1 text-xs ${tooLong ? "text-danger" : "text-faint"}`}>
                    {tooLong
                        ? "Not çok uzun, biraz kısalt."
                        : "Sadece grup görür. Sözler açılınca üstte sabit durur."}
                </p>

                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={busy || tooLong || (!changed && !!initial) || (!text.trim() && !initial)}
                        className="h-11 flex-1 rounded-full bg-accent text-sm font-extrabold text-on-accent transition active:scale-95 disabled:opacity-40"
                    >
                        Kaydet
                    </button>
                    {initial && (
                        <button
                            type="button"
                            onClick={del}
                            disabled={busy}
                            aria-label="Notu sil"
                            className="flex size-11 items-center justify-center rounded-full bg-danger/15 text-danger transition active:scale-95 disabled:opacity-50"
                        >
                            <Trash2 size={17} />
                        </button>
                    )}
                </div>
            </form>
        </div>,
        document.body
    );
}

// Sözler penceresinin üstünde sabit not. Sözler kayar, not yerinde kalır.
// Üç boy: kapalı (sadece şerit), normal (ekranın dörtte biri), büyük (yarısı). Telefon hatırlar.
type Size = "closed" | "normal" | "big";
const SIZE_KEY = "dash-not-boyut";
const HEIGHT: Record<Exclude<Size, "closed">, string> = {
    normal: "max-h-[25dvh]",
    big: "max-h-[50dvh]",
};

function readSize(): Size {
    try {
        const v = localStorage.getItem(SIZE_KEY);
        if (v === "closed" || v === "normal" || v === "big") return v;
    } catch {
        // varsayılanda kal
    }
    return "normal";
}

const iconBtn =
    "flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-line hover:text-ink active:scale-95";

export function NotePanel({ name, artists }: Song) {
    const { get, edit } = useNotes();
    const note = get({ name, artists });
    const [size, setSizeState] = useState<Size>("normal");

    useEffect(() => {
        const t = setTimeout(() => setSizeState(readSize()), 0);
        return () => clearTimeout(t);
    }, []);

    function setSize(next: Size) {
        setSizeState(next);
        try {
            localStorage.setItem(SIZE_KEY, next);
        } catch {
            // yazılamazsa sadece hatırlanmaz
        }
    }

    // Not yoksa hiç yer kaplamaz: sözler direkt açılır
    if (!note) return null;

    const open = size !== "closed";
    return (
        <section
            aria-label="Şarkı notu"
            className="shrink-0 border-b border-accent/30 bg-accent/[0.07]"
        >
            <div className="flex items-center gap-1 py-1 pl-5 pr-3">
                <button
                    type="button"
                    onClick={() => setSize(open ? "closed" : "normal")}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
                >
                    <StickyNote size={15} className="shrink-0 text-accent" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-accent">
                        Not
                    </span>
                    {!open && (
                        <span className="min-w-0 truncate font-mono text-sm font-semibold text-ink">
                            {note.body.split("\n")[0]}
                        </span>
                    )}
                    {open ? (
                        <ChevronUp size={15} className="shrink-0 text-muted" />
                    ) : (
                        <ChevronDown size={15} className="shrink-0 text-muted" />
                    )}
                </button>
                {open && (
                    <button
                        type="button"
                        onClick={() => setSize(size === "big" ? "normal" : "big")}
                        aria-label={size === "big" ? "Notu küçült" : "Notu büyüt"}
                        title={size === "big" ? "Küçült" : "Büyüt"}
                        className={iconBtn}
                    >
                        {size === "big" ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => edit({ name, artists })}
                    aria-label="Notu düzenle"
                    title="Düzenle"
                    className={iconBtn}
                >
                    <Pencil size={14} />
                </button>
            </div>
            {open && (
                <div
                    className={`${HEIGHT[size]} overflow-y-auto overscroll-contain px-5 pb-3 [scrollbar-color:var(--color-line)_transparent] [scrollbar-width:thin]`}
                >
                    <p
                        className={`whitespace-pre-wrap break-words font-mono font-bold leading-relaxed text-ink ${
                            size === "big" ? "text-xl" : "text-lg"
                        }`}
                    >
                        {note.body}
                    </p>
                </div>
            )}
        </section>
    );
}
