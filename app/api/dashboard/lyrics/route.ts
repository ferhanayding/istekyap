import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getLyrics } from "@/lib/genius";

// Sözler sadece giriş yapmış dashboard kullanıcısına verilir
export async function GET(req: NextRequest) {
    if (!(await requireUser())) {
        return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    const name = req.nextUrl.searchParams.get("name")?.trim() ?? "";
    const artists = req.nextUrl.searchParams.get("artists")?.trim() ?? "";
    if (!name || name.length > 150 || artists.length > 200) {
        return NextResponse.json({ error: "Geçersiz şarkı." }, { status: 400 });
    }

    try {
        const result = await getLyrics(name, artists);
        return NextResponse.json(result, {
            headers: { "Cache-Control": "private, no-store" },
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json(
            { error: "Sözler alınamadı." },
            { status: 502 }
        );
    }
}
