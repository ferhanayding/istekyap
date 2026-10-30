export default function LoadingTracks() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <div
                    key={i}
                    className="flex animate-pulse items-center gap-3 rounded-2xl bg-[#19162D] p-3"
                >
                    <div className="size-[58px] rounded-xl bg-white/10" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 rounded bg-white/10" />
                        <div className="h-2 w-1/2 rounded bg-white/10" />
                    </div>
                </div>
            ))}
        </div>
    );
}