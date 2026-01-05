
interface BannerAdProps {
    format: 'leaderboard' | 'rect' | 'skyscraper';
    className?: string;
}

export default function BannerAd({ format, className = '' }: BannerAdProps) {
    let width = 300;
    let height = 250;

    if (format === 'leaderboard') {
        width = 728;
        height = 90;
    } else if (format === 'skyscraper') {
        width = 160;
        height = 600;
    }

    return (
        <div 
            className={`bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center relative overflow-hidden ${className}`}
            style={{ width, height }}
        >
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                 style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 10px, transparent 10px, transparent 20px)'}} 
            />
            <div className="z-10 text-center">
                <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-1">Advertisement</p>
                <p className="text-gray-400 text-[10px] font-mono">{width}x{height}</p>
            </div>
        </div>
    );
}
