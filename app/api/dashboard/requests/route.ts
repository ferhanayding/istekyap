import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}