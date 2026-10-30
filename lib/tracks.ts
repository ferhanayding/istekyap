import { cache } from "react";
import { getPlaylistTracks } from "@/lib/spotify";

export const getTracks = cache(getPlaylistTracks);