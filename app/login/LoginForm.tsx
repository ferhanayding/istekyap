"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export default function LoginForm() {
    const [state, action, pending] = useActionState<LoginState, FormData>(
        login,
        null
    );

    const input =
        "w-full rounded-2xl border border-line bg-raised px-4 py-3 text-base text-ink outline-none placeholder:text-faint focus:border-accent";

    return (
        <form action={action} className="space-y-3">
            <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-muted">
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
                <span className="mb-1.5 block text-xs font-bold text-muted">
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
                <p role="alert" className="text-sm text-danger">
                    {state.error}
                </p>
            )}

            <button
                type="submit"
                disabled={pending}
                className="h-12 w-full rounded-2xl bg-accent text-sm font-extrabold text-on-accent transition active:scale-[0.98] disabled:opacity-60"
            >
                {pending ? "Giriş yapılıyor…" : "Giriş yap"}
            </button>
        </form>
    );
}