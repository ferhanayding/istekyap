import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { POLL_RESULT_MS, type Poll } from "@/lib/poll-types";

type Row = {
    id: string;
    options: { id: string; name: string; artists: string; cover: string | null }[];
    created_at: string;
    closed_at: string | null;
};

// yeni-ozellikler.sql çalıştırılmadıysa tablo yoktur (PGRST205 / 42P01): özellik kapalı sayılır
export function pollTableMissing(e: { code?: string } | null): boolean {
    return e?.code === "PGRST205" || e?.code === "42P01";
}

async function latestRow(): Promise<Row | null> {
    const { data, error } = await supabaseAdmin
        .from("polls")
        .select("id, options, created_at, closed_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (pollTableMissing(error)) return null;
    if (error) throw error;
    return (data as Row | null) ?? null;
}

async function withCounts(row: Row): Promise<Poll> {
    const { data, error } = await supabaseAdmin
        .from("poll_votes")
        .select("option_id")
        .eq("poll_id", row.id)
        .limit(5000);
    if (error) throw error;

    const counts = new Map<string, number>();
    for (const v of data ?? []) counts.set(v.option_id, (counts.get(v.option_id) ?? 0) + 1);
    const options = (row.options ?? []).map((o) => ({ ...o, votes: counts.get(o.id) ?? 0 }));
    return {
        id: row.id,
        options,
        total: options.reduce((n, o) => n + o.votes, 0),
        createdAt: row.created_at,
        closedAt: row.closed_at,
    };
}

// Bir saniye bellekte durur: oylama sırasında herkes aynı anda sorar
let cache: { poll: Poll | null; expires: number } | null = null;
export function clearPollCache() {
    cache = null;
}

// En son anket (bitmiş olsa da). Dashboard bunu kullanır.
export async function getLatestPoll(opts: { fresh?: boolean } = {}): Promise<Poll | null> {
    if (!opts.fresh && cache && Date.now() < cache.expires) return cache.poll;
    const row = await latestRow();
    const poll = row ? await withCounts(row) : null;
    cache = { poll, expires: Date.now() + 1000 };
    return poll;
}

// Ziyaretçinin gördüğü: açık anket, ya da az önce bitmiş olan (kazanan görünsün)
export async function getVisiblePoll(opts: { fresh?: boolean } = {}): Promise<Poll | null> {
    const poll = await getLatestPoll(opts);
    if (!poll) return null;
    if (poll.closedAt && Date.now() - new Date(poll.closedAt).getTime() > POLL_RESULT_MS) {
        return null;
    }
    return poll;
}

// Açık anket varsa bitirir. Tablo yoksa sessizce geçer (gece bitirilirken de çağrılır).
export async function closeOpenPolls(): Promise<void> {
    const { error } = await supabaseAdmin
        .from("polls")
        .update({ closed_at: new Date().toISOString() })
        .is("closed_at", null);
    clearPollCache();
    if (error && !pollTableMissing(error)) throw error;
}

export async function startPoll(options: Row["options"]): Promise<{ missing: boolean }> {
    // Aynı anda tek anket: öncekini bitir
    const closed = await supabaseAdmin
        .from("polls")
        .update({ closed_at: new Date().toISOString() })
        .is("closed_at", null);
    if (pollTableMissing(closed.error)) return { missing: true };
    if (closed.error) throw closed.error;

    const { error } = await supabaseAdmin.from("polls").insert({ options });
    clearPollCache();
    if (pollTableMissing(error)) return { missing: true };
    if (error) throw error;
    return { missing: false };
}

// Oy ver ya da değiştir. Dönüş: "ok" | "closed" (anket yok/bitti) | "invalid" (seçenek yok)
export async function castVote(
    deviceId: string,
    pollId: string,
    optionId: string
): Promise<"ok" | "closed" | "invalid"> {
    const row = await latestRow();
    if (!row || row.id !== pollId || row.closed_at) return "closed";
    if (!row.options.some((o) => o.id === optionId)) return "invalid";

    const { error } = await supabaseAdmin
        .from("poll_votes")
        .upsert(
            { poll_id: pollId, device_id: deviceId, option_id: optionId },
            { onConflict: "poll_id,device_id" }
        );
    if (error) throw error;
    clearPollCache();
    return "ok";
}
