import "server-only";
import { cookies } from "next/headers";

const COOKIE = "device_id";
const UUID = /^[0-9a-f-]{36}$/i;

// Sadece okur, ziyaretçiye çerez bırakmaz
export async function readDeviceId(): Promise<string | undefined> {
    const value = (await cookies()).get(COOKIE)?.value;
    return value && UUID.test(value) ? value : undefined;
}

// Yoksa yeni bir kimlik üretip çerez olarak bırakır
export async function getOrCreateDeviceId(): Promise<string> {
    const existing = await readDeviceId();
    if (existing) return existing;

    const id = crypto.randomUUID();
    (await cookies()).set(COOKIE, id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
    });
    return id;
}