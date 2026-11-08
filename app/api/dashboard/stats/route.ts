import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getStats } from "@/lib/stats";

export async function GET() {
    if (!(await requireUser())) {
        return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }
    try {
        return NextResponse.json(await getStats(), {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "İstatistikler alınamadı." }, { status: 500 });
    }
}
