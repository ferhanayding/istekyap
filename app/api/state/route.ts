import { getAppState } from "@/lib/app-state";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const state = await getAppState();
        return NextResponse.json(state, {
            headers: {
                "Cache-Control": "public, s-maxage=2",
            },
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Durum alınamadı." }, { status: 500 });
    }
}