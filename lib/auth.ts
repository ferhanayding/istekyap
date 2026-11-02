import "server-only";
import { createClient } from "@/lib/supabase/server";

// Giriş yapmış grup üyesini döndürür, giriş yoksa null
export async function requireUser() {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user;
}