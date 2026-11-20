import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type NoteRow = { request_id: string; note: string | null; created_at: string };

// Ziyaretçilerin isteğe eklediği notlar ("Kime ya da neden?"), istek başına eskiden yeniye.
// En eski aktif istekten beri yazılanlar okunur, aktif olmayanlar ayıklanır.
// istek-notu.sql çalıştırılmadıysa sütun yoktur: notsuz devam edilir.
async function notesFor(ids: Set<string>, since: string) {
    const byRequest = new Map<string, { text: string; at: string }[]>();
    const { data, error } = await supabaseAdmin
        .from("request_devices")
        .select("request_id, note, created_at")
        .not("note", "is", null)
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(1000);
    if (error) {
        if (error.code !== "42703" && error.code !== "PGRST204") console.error(error);
        return byRequest;
    }
    for (const row of (data ?? []) as NoteRow[]) {
        if (!row.note || !ids.has(row.request_id)) continue;
        const list = byRequest.get(row.request_id) ?? [];
        list.push({ text: row.note, at: row.created_at });
        byRequest.set(row.request_id, list);
    }
    return byRequest;
}

export async function GET() {
    if (!(await requireUser())) {
        return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
        .from("requests")
        .select("id, spotify_id, name, artists, cover, status, request_count, created_at, last_requested_at")
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        // Kalabalık gecede eski bekleyen istekler gözden kaçmasın (PostgREST üst sınırı 1000)
        .limit(1000);

    if (error) {
        console.error(error);
        return NextResponse.json({ error: "Liste alınamadı." }, { status: 500 });
    }

    const rows = data ?? [];
    // Liste yeniden eskiye: sonuncusu en eski aktif istek
    const oldest = rows.at(-1)?.created_at;
    const notes = oldest
        ? await notesFor(new Set(rows.map((r) => r.id)), oldest)
        : new Map<string, { text: string; at: string }[]>();
    const list = rows.map((r) => {
        const n = notes.get(r.id);
        return n ? { ...r, notes: n } : r;
    });

    return NextResponse.json(list, { headers: { "Cache-Control": "no-store" } });
}
