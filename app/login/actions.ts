"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string } | null;

export async function login(
    _prev: LoginState,
    formData: FormData
): Promise<LoginState> {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    if (!email || !password) return { error: "E-posta ve şifreyi yaz." };

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "E-posta ya da şifre yanlış." };

    redirect("/dashboard");
}

export async function logout() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
}