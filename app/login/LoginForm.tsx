"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export default function LoginForm() {
    const [state, action, pending] = useActionState<LoginState, FormData>(
        login,
        null
    );

    const input =
        "w-full rounded-2xl border border-white/[0.08] bg-[#1E1A3D] px-4 py-3 text-base text-white outline-none placeholder:text-[#7E769B] focus:border-[#9B80FF]/60";

    return (
        <form action={action} className="space-y-3">
            <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-[#A99EC9]">
                    E-posta
                </span>
                <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={input}
                />
            </label>

            <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-[#A99EC9]">
                    Şifre
                </span>
                <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className={input}
                />
            </label>

            {state?.error && (
                <p role="alert" className="text-sm text-[#FF729B]">
                    {state.error}
                </p>
            )}

            <button
                type="submit"
                disabled={pending}
                className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#7555E9] to-[#5A3FC0] text-sm font-extrabold shadow-[0_10px_30px_-14px_#795BFF] transition active:scale-[0.98] disabled:opacity-60"
            >
                {pending ? "Giriş yapılıyor…" : "Giriş yap"}
            </button>
        </form>
    );
}