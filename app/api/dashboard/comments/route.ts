import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
    if (!(await requireUser())) {
        return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    // Son 500 yorum üzerinden liste ve ortalama
    const { data, error } = await supabaseAdmin
        .from("comments")
        .select("id, rating, message, name, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

    if (error) {
        console.error(error);
        return NextResponse.json({ error: "Yorumlar alınamadı." }, { status: 500 });
    }

    const items = data ?? [];
    const distribution = [0, 0, 0, 0, 0]; // 1 yıldızdan 5 yıldıza
    let sum = 0;
    for (const c of items) {
        const r = Number(c.rating);
        if (r >= 1 && r <= 5) {
            distribution[r - 1]++;
            sum += r;
        }
    }

    return NextResponse.json(
        {
            items,
            count: items.length,
            average: items.length ? sum / items.length : 0,
            distribution,
        },
        { headers: NO_STORE }
    );
}

export async function DELETE(req: NextRequest) {
    if (!(await requireUser())) {
        return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id") ?? "";
    if (!UUID.test(id)) {
        return NextResponse.json({ error: "Geçersiz yorum." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("comments").delete().eq("id", id);
    if (error) {
        console.error(error);
        return NextResponse.json({ error: "Silinemedi." }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
