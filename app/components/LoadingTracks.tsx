export default function LoadingTracks() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <div
                    key={i}
                    className="flex animate-pulse items-center gap-3 rounded-2xl bg-surface p-3"
                >
                    <div className="size-[58px] rounded-xl bg-line" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 rounded bg-line" />
                        <div className="h-2 w-1/2 rounded bg-line" />
                    </div>
                </div>
            ))}
        </div>
    );
}