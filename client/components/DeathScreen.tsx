import { useState, useEffect } from 'react';

interface DeathScreenProps {
  finalScore: number;
  killer: string;
  canRevive: boolean;
  onRespawn: (type: 'normal' | 'ad') => void;
  onSpectate: () => void;
}

export default function DeathScreen({ finalScore, killer, canRevive, onRespawn, onSpectate }: DeathScreenProps) {
  const [adTimer, setAdTimer] = useState(0);
  const [showingAd, setShowingAd] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showingAd && adTimer > 0) {
      interval = setInterval(() => setAdTimer((p) => p - 1), 1000);
    } else if (showingAd && adTimer === 0) {
      // Ad finished
      onRespawn('ad');
    }
    return () => clearInterval(interval);
  }, [showingAd, adTimer, onRespawn]);

  const handleWatchAd = () => {
    setShowingAd(true);
    setAdTimer(3); // 3-second fake ad
  };

  if (showingAd) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
        <div className="text-white text-4xl font-bold animate-pulse mb-8">
          ADVERTISEMENT
        </div>
        <div className="text-gray-400 text-xl">
          Reward in {adTimer}s...
        </div>
        <div className="mt-8 p-4 border border-gray-700 rounded bg-gray-900 text-gray-500 text-sm max-w-md text-center">
         [Mock Ad] Imagine a cool video here about CheezyIO Premium.
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-gray-900 border-2 border-red-900/50 p-8 rounded-2xl max-w-md w-full shadow-2xl relative text-center">
        
        <div className="mb-6">
            <h2 className="text-5xl font-black text-red-500 mb-2 drop-shadow-lg tracking-wider">
                WASTED
            </h2>
            <div className="text-gray-400 text-sm uppercase tracking-widest">
                Eaten by <span className="text-white font-bold">{killer}</span>
            </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 mb-8 border border-white/5">
            <div className="text-gray-400 text-xs uppercase mb-1">Final Mass</div>
            <div className="text-4xl font-mono font-bold text-yellow-400">
                {finalScore.toLocaleString()}
            </div>
        </div>

        <div className="space-y-3">
            {canRevive && (
                <button 
                    onClick={handleWatchAd}
                    className="w-full py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold rounded-xl shadow-lg transform transition hover:scale-[1.02] flex items-center justify-center gap-2 group border-b-4 border-green-800 active:border-b-0 active:translate-y-1"
                >
                    <span className="text-xl">📺</span>
                    <div className="text-left leading-tight">
                        <div className="text-sm opacity-90">Second Chance</div>
                        <div className="text-xs font-normal opacity-75">Recover 50% Mass</div>
                    </div>
                </button>
            )}

            <button 
                onClick={() => onRespawn('normal')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
            >
                Respawn (Fresh Start)
            </button>

            <button 
                onClick={onSpectate}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold rounded-xl transition"
            >
                Spectate
            </button>
        </div>
      </div>
    </div>
  );
}
