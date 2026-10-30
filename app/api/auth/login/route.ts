import { NextResponse } from "next/server";

export function GET() {
    const params = new URLSearchParams({
        response_type: "code",
        client_id: process.env.SPOTIFY_CLIENT_ID!,
        scope: "playlist-read-private playlist-read-collaborative",
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    });
    return NextResponse.redirect(
        `https://accounts.spotify.com/authorize?${params}`
    );
}