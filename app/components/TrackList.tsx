import { getTracks } from "@/lib/tracks";
import TrackItem from "./TrackItem";

export default async function TrackList() {
    const tracks = await getTracks();

    return (
        <div className="space-y-2">
            {tracks.map((t, i) => (
                <TrackItem key={`${t.id}-${i}`} track={t} index={i} />
            ))}
        </div>
    );
}