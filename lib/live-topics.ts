// Sunucu ve tarayıcı aynı kanalı, aynı olay adını kullanır
export const LIVE_CHANNEL = "istek-yap";
export const LIVE_EVENT = "changed";

// requests: istek listesi değişti · state: istek/oylama açık-kapalı, çalan şarkı
export type LiveTopic = "requests" | "state";
