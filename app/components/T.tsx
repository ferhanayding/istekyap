"use client";

import { useT } from "@/lib/i18n";
import type { MsgKey } from "@/lib/i18n-dict";

// Sunucu bileşenlerinin içinde çevrilen metin
export default function T({ k }: { k: MsgKey }) {
    return useT()(k);
}
