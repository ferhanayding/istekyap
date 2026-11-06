export default function EqBars({ className = "" }: { className?: string }) {
    return (
        <span
            className={`inline-flex h-3 items-end gap-[2px] ${className}`}
            aria-hidden
        >
            {[0, 0.25, 0.5].map((d) => (
                <span
                    key={d}
                    style={{ animationDelay: `${d}s` }}
                    className="h-full w-[3px] origin-bottom animate-[eq_0.9s_ease-in-out_infinite] rounded-sm bg-[#1ED760] motion-reduce:animate-none"
                />
            ))}
        </span>
    );
}