import { NextResponse } from "next/server";

// Sadece geliştirirken refresh token almak için (README: Spotify token). Canlı sitede kapalı.
export function GET() {
    if (process.env.NODE_ENV !== "development") {
        return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });
    }
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