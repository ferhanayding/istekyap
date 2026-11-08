export type SongStat = {
    id: string;
    name: string;
    artists: string;
    cover: string | null;
    requests: number;
    nights: number;
    approved: number;
    rejected: number;
    plays: number;
    likes: number;
    dislikes: number;
    firstRequested: string | null;
    lastRequested: string | null;
    lastPlayed: string | null;
};

export type Stats = {
    totalRequests: number;
    requestedSongs: number;
    people: number;
    approvalRate: number | null;
    plays: number;
    likes: number;
    dislikes: number;
    medianWaitMin: number | null;
    avgRating: number | null;
    comments: number;
    /** Europe/Istanbul saatine göre 0–23 */
    hours: number[];
    songs: SongStat[];
};

export type NightSummary = {
    archivedAt: string;
    startedAt: string;
    requests: number;
    played: number;
    rejected: number;
    songs: { id: string; name: string; artists: string; count: number; status: string }[];
};

export type StatsResponse = {
    since: string | null;
    night: Stats;
    total: Stats;
    nights: NightSummary[];
};
