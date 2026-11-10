import "server-only";
import { createClient } from "@/lib/supabase/server";

// Giriş yapmış grup üyesinin oturum bilgisi, giriş yoksa null.
// getClaims oturum anahtarının imzasını sunucuda kendisi doğrular (projede ES256 anahtar var),
// getUser gibi her çağrıda Supabase'e ayrıca gitmez: dashboard API'leri bu sayede hızlı.
export async function requireUser() {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) return null;
    return data.claims;
}
