import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const FLAGS_TAG = "app-flags";

// Dashboard'daki açma/kapama anahtarları: istek alma, oylama, playlist görünürlüğü
export type AppFlags = {
    requestsOpen: boolean;
    votingOpen: boolean;
    playlistVisible: boolean;
};

// Ana sayfanın hazır HTML'ine gömülür, böylece sayfa ilk anda doğru hâliyle açılır
// (istekler kapalıysa buton baştan kapalı, playlist gizliyse hiç görünmez).
// Dashboard bir anahtarı değiştirince FLAGS_TAG hemen geçersiz kılınır.
export async function getAppFlags(): Promise<AppFlags> {
    "use cache";
    cacheLife({ stale: 300, revalidate: 300, expire: 365 * 24 * 60 * 60 });
    cacheTag(FLAGS_TAG);

    const { data, error } = await supabaseAdmin
        .from("app_state")
        .select("requests_open, voting_open, playlist_visible")
        .eq("id", 1)
        .maybeSingle();
    if (error) throw error;

    // Satır yoksa istek ve oylama kapalı, playlist açık sayılır
    return {
        requestsOpen: !!data?.requests_open,
        votingOpen: !!data?.voting_open,
        playlistVisible: data ? data.playlist_visible !== false : true,
    };
}
