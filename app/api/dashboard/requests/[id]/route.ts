import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyLive } from "@/lib/live-server";
import { clearAppStateCache } from "@/lib/app-state";
import { recordPlay, unmarkPlayedTonight } from "@/lib/plays";

const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = ["pending", "approved", "played", "rejected"];
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
    if (!(await requireUser())) {
        return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    const { id } = await params;
    if (!UUID.test(id)) {
        return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const status = body?.status;
    if (typeof status !== "string" || !STATUSES.includes(status)) {
        return NextResponse.json({ error: "Geçersiz durum." }, { status: 400 });
    }

    const { data: row, error } = await supabaseAdmin
        .from("requests")
        .update({ status })
        .eq("id", id)
        .select("spotify_id, name, artists, cover")
        .maybeSingle();

    // 23505: aynı şarkı zaten bekleyen listede
    if (error?.code === "23505") {
        return NextResponse.json(
            { error: "Bu şarkı zaten bekleyen listede." },
            { status: 409 }
        );
    }
    if (error) {
        console.error(error);
        return NextResponse.json({ error: "İşlem yapılamadı." }, { status: 500 });
    }
    if (!row) {
        return NextResponse.json({ error: "İstek bulunamadı." }, { status: 404 });
    }

    // Elle "Çalındı" denince de "Çal"daki gibi: bu gece oylanabilir olur, istatistiğe yazılır
    if (status === "played") {
        try {
            await recordPlay(row.spotify_id, row);
        } catch (e) {
            console.error(e);
        }
        clearAppStateCache();
        notifyLive("requests", "state");
    } else if (status === "pending" || status === "approved") {
        // Çalındı'dan geri alındıysa (yanlış basıldı ya da tekrar çalınacak) şarkı yine
        // istenebilir olsun: listede bekleyen ama "zaten çalındı" diye katılınamayan kart kalmasın
        await unmarkPlayedTonight(row.spotify_id).catch((e) => console.error(e));
        clearAppStateCache();
        notifyLive("requests", "state");
    } else {
        notifyLive("requests");
    }
    return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
    if (!(await requireUser())) {
        return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    const { id } = await params;
    if (!UUID.test(id)) {
        return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("requests").delete().eq("id", id);
    if (error) {
        console.error(error);
        return NextResponse.json({ error: "İşlem yapılamadı." }, { status: 500 });
    }

    notifyLive("requests");
    return NextResponse.json({ ok: true });
}