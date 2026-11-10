import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

const PAGE = 1000;

// Supabase bir seferde en fazla 1000 satır verir: sayfa sayfa çek
export async function allRows<T>(table: string, columns: string): Promise<T[]> {
    const out: T[] = [];
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabaseAdmin
            .from(table)
            .select(columns)
            .range(from, from + PAGE - 1);
        if (error) throw error;
        out.push(...((data ?? []) as T[]));
        if (!data || data.length < PAGE) return out;
        if (from > 50 * PAGE) return out; // emniyet
    }
}
