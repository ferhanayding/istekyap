import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { MAX_NOTE, songKey, type SongNote } from "@/lib/song-notes";

// Şarkı notları sadece giriş yapmış grup üyesine: ziyaretçi tarafında hiçbir yerden okunmaz.
// Proxy de /api/dashboard altını girişsiz kapatır.

const NO_STORE = { "Cache-Control": "no-store" };
const NEED_SQL = "Önce Supabase'de supabase/notlar.sql dosyasını çalıştır.";

// notlar.sql çalıştırılmadıysa tablo yoktur
const missing = (e: { code?: string } | null) => e?.code === "PGRST205" || e?.code === "42P01";

function song(name: unknown, artists: unknown) {
    if (typeof name !== "string" || typeof artists !== "string") return null;
    const n = name.trim();
    const a = artists.trim();
    if (!n || n.length > 200 || a.length > 300) return null;
    return { name: n, artists: a, key: songKey(n, a) };
}

// Bütün notlar bir kerede (birkaç yüz kısa satır): dashboard hangi şarkıda not olduğunu
// listede gösterir, sözler açılınca not beklemeden görünür
export async function GET() {
    if (!(await requireUser())) {
        return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }
    const { data, error } = await supabaseAdmin
        .from("song_notes")
        .select("key, body, updated_at")
        .limit(2000);
    if (missing(error)) {
        return NextResponse.json({ notes: [], needSql: true }, { headers: NO_STORE });
    }
    if (error) {
        console.error(error);
        return NextResponse.json({ error: "Notlar alınamadı." }, { status: 500 });
    }
    const notes: SongNote[] = (data ?? []).map((r) => ({
        key: r.key,
        body: r.body,
        updatedAt: r.updated_at,
    }));
    return NextResponse.json({ notes }, { headers: NO_STORE });
}

export async function PUT(req: NextRequest) {
    if (!(await requireUser())) {
        return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }
    const body = await req.json().catch(() => null);
    const s = song(body?.name, body?.artists);
    const text = typeof body?.body === "string" ? body.body.replace(/\r\n?/g, "\n").trim() : null;
    if (!s || text === null) {
        return NextResponse.json({ error: "Geçersiz not." }, { status: 400 });
    }
    if (!text) return NextResponse.json({ error: "Not boş olamaz." }, { status: 400 });
    if (text.length > MAX_NOTE) {
        return NextResponse.json({ error: "Not çok uzun." }, { status: 400 });
    }

    const updatedAt = new Date().toISOString();
    const { error } = await supabaseAdmin.from("song_notes").upsert(
        { key: s.key, name: s.name, artists: s.artists, body: text, updated_at: updatedAt },
        { onConflict: "key" }
    );
    if (missing(error)) return NextResponse.json({ error: NEED_SQL }, { status: 409 });
    if (error) {
        console.error(error);
        return NextResponse.json({ error: "Not kaydedilemedi." }, { status: 500 });
    }
    const note: SongNote = { key: s.key, body: text, updatedAt };
    return NextResponse.json({ note }, { headers: NO_STORE });
}

export async function DELETE(req: NextRequest) {
    if (!(await requireUser())) {
        return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }
    const s = song(
        req.nextUrl.searchParams.get("name"),
        req.nextUrl.searchParams.get("artists") ?? ""
    );
    if (!s) return NextResponse.json({ error: "Geçersiz şarkı." }, { status: 400 });

    const { error } = await supabaseAdmin.from("song_notes").delete().eq("key", s.key);
    if (missing(error)) return NextResponse.json({ error: NEED_SQL }, { status: 409 });
    if (error) {
        console.error(error);
        return NextResponse.json({ error: "Not silinemedi." }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
