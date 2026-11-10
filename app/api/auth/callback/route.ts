import { NextRequest, NextResponse } from "next/server";

// Sadece geliştirirken refresh token almak için (README: Spotify token). Canlı sitede kapalı.
export async function GET(req: NextRequest) {
    if (process.env.NODE_ENV !== "development") {
        return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });
    }
    const code = req.nextUrl.searchParams.get("code");
    if (!code) {
        return NextResponse.json({ error: "code yok" }, { status: 400 });
    }

    const basic = Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            Authorization: `Basic ${basic}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
        }),
    });

    const data = await res.json();
    return NextResponse.json({
        refresh_token: data.refresh_token,
        error: data.error_description,
    });
}