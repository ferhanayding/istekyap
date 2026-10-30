import { getTracks } from "@/lib/tracks";

export default async function TrackCount() {
    const tracks = await getTracks();
    return <>{tracks.length} şarkı</>;
}