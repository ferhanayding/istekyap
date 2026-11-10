import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { readFlags } from "@/lib/app-state";

export const FLAGS_TAG = "app-flags";

// Dashboard'daki açma/kapama anahtarları: gece, istek alma, oylama, sözler, playlist
export type AppFlags = ReturnType<typeof readFlags>;

// Ana sayfanın hazır HTML'ine gömülür, böylece sayfa ilk anda doğru hâliyle açılır
// (istekler kapalıysa uyarı ve kapalı buton baştan görünür, playlist gizliyse hiç görünmez).
// Dashboard bir anahtarı değiştirince FLAGS_TAG hemen geçersiz kılınır.
export async function getAppFlags(): Promise<AppFlags> {
    "use cache";
    cacheLife({ stale: 300, revalidate: 300, expire: 365 * 24 * 60 * 60 });
    cacheTag(FLAGS_TAG);

    // "*": gece.sql henüz çalıştırılmadıysa yeni sütunlar yoktur, yine de okunabilsin
    const { data, error } = await supabaseAdmin
        .from("app_state")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
    if (error) throw error;
    return readFlags(data);
}
