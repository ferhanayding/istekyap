import { NextResponse } from "next/server";
import { getPlaylistTracks } from "@/lib/spotify";


export async function GET() {
    try {
        return NextResponse.json(await getPlaylistTracks());
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}