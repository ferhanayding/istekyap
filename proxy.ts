import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Oturumu yeniler. Bu satırla yukarıdaki createServerClient arasına kod ekleme.
    const { data } = await supabase.auth.getClaims();
    const loggedIn = !!data?.claims;
    const { pathname } = request.nextUrl;

    // Giriş yoksa API'ler 401 döner, sayfalar giriş ekranına gider
    if (!loggedIn && pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }
    if (!loggedIn && pathname.startsWith("/dashboard")) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.search = "";
        return NextResponse.redirect(url);
    }

    if (loggedIn && pathname === "/login") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";
        const redirect = NextResponse.redirect(url);
        response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
        return redirect;
    }

    return response;
}

export const config = {
    matcher: ["/dashboard/:path*", "/login", "/api/dashboard/:path*"],
};