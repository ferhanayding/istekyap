export default function NowPlayingBadge({ className = "" }: { className?: string }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#37D9BD] ${className}`}
        >
            <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#37D9BD] opacity-70 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-[#37D9BD]" />
            </span>
            <span className="flex h-3 items-end gap-[2px]" aria-hidden>
                {[0, 0.25, 0.5].map((d) => (
                    <span
                        key={d}
                        style={{ animationDelay: `${d}s` }}
                        className="h-full w-[3px] origin-bottom animate-[eq_0.9s_ease-in-out_infinite] rounded-sm bg-[#37D9BD] motion-reduce:animate-none"
                    />
                ))}
            </span>
            Çalıyor
        </span>
    );
}