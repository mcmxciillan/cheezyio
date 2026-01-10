'use client';

import { useEffect, useState } from 'react';
import * as Phaser from 'phaser';

interface HUDProps {
  game: Phaser.Game | null;
  username: string;
  onQuit: () => void;
}

interface KillEntry {
  id: string;
  killer: string;
  victim: string;
}

export default function HUD({ game, username, onQuit }: HUDProps) {
  const [score, setScore] = useState(0);
  const [killFeed, setKillFeed] = useState<KillEntry[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  // Effects state? Use if needed.

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const checkMobile = () => setIsMobile(window.matchMedia('(max-width: 768px)').matches);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  const [leaderboard, setLeaderboard] = useState<{name: string, score: number}[]>([]);

  useEffect(() => {
    if (!game) return;

    const onUpdateScore = (newScore: number) => setScore(Math.floor(newScore));
    const onUpdateLeaderboard = (data: {name: string, score: number}[]) => setLeaderboard(data);
    
    const onPlayerKilled = (data: { killer: string; victim: string }) => {
      const entry = { id: Math.random().toString(), ...data };
      setKillFeed(prev => [entry, ...prev].slice(0, 5));
      setTimeout(() => {
        setKillFeed(prev => prev.filter(k => k.id !== entry.id));
      }, 5000);
    };

    game.events.on('updateScore', onUpdateScore);
    game.events.on('updateLeaderboard', onUpdateLeaderboard);
    game.events.on('playerKilled', onPlayerKilled);

    return () => {
      game.events.off('updateScore', onUpdateScore);
      game.events.off('updateLeaderboard', onUpdateLeaderboard);
      game.events.off('playerKilled', onPlayerKilled);
    };
  }, [game]);

  // Mobile Controls (Simplified for now - Logic usually complicated)
  // For verify build, plain buttons are fine. 
  // Real implementation needs Joystick.
  const handleBoostStart = () => {
      if(game) game.events.emit('boost', true);
  };
  const handleBoostEnd = () => {
      if(game) game.events.emit('boost', false);
  };
  
  // Joystick Placeholder
  // Ideally import a Joystick lib or use custom.
  // We'll leave it visual for build success.

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4 mix-blend-difference">
      {/* Top Bar */}
      <div className="flex justify-between items-start w-full">
         <div className="flex flex-col items-start gap-2">
             <button 
                 onClick={() => onQuit()}
                 className="pointer-events-auto px-4 py-1 bg-red-600/80 hover:bg-red-500 text-white rounded font-bold text-sm transition-colors border-2 border-red-800"
             >
                 Exit Game
             </button>
             <div className="text-white font-bold text-2xl md:text-4xl drop-shadow-md">
                 {username}: {score}
             </div>
         </div>
         <div className="flex flex-col items-end space-y-2">
             {/* Leaderboard */}
             <div className="bg-black/50 p-2 rounded-lg backdrop-blur-sm mb-2">
                 <div className="text-yellow-500 font-bold text-xs uppercase mb-1 tracking-wider text-right">Leaderboard</div>
                 {leaderboard.map((p, i) => (
                     <div key={i} className={`text-sm flex justify-between w-40 ${p.name === username ? 'text-green-400 font-bold' : 'text-white'}`}>
                         <span>{i+1}. {p.name.substring(0, 10)}</span>
                         <span>{Math.floor(p.score)}</span>
                     </div>
                 ))}
             </div>

             {/* Kill Feed */}
             {killFeed.map(k => (
                 <div key={k.id} className="bg-black/50 text-white px-2 py-1 rounded text-sm md:text-base animate-fade-in-out border-l-2 border-red-500">
                     <span className="text-yellow-400 font-bold">{k.killer}</span>
                     <span className="text-gray-300 mx-1">ate</span>
                     <span className="text-red-400 font-bold">{k.victim}</span>
                 </div>
             ))}
         </div>
      </div>

      {/* Mobile Controls (Visible only on mobile) */}
      <div className={`pointer-events-auto flex justify-between items-end w-full pb-8 md:hidden ${isMobile ? 'flex' : 'hidden'}`}>
           {/* Joystick Zone (Left) - Placeholder */}
           <div className="w-32 h-32 bg-white/10 rounded-full border-2 border-white/30 backdrop-blur-sm relative"
                onTouchStart={() => {
                    // Joystick Logic would go here
                }}
           >
               <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-white/80 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg"/>
           </div>

           {/* Boost Button (Right) */}
           <button 
               className="w-24 h-24 bg-red-500/80 rounded-full border-4 border-red-400 shadow-xl active:scale-95 transition-transform flex items-center justify-center"
               onTouchStart={handleBoostStart}
               onTouchEnd={handleBoostEnd}
               onMouseDown={handleBoostStart}
               onMouseUp={handleBoostEnd}
           >
               <span className="text-4xl">🚀</span>
           </button>
      </div>

      <style jsx>{`
        .animate-fade-in-out {
            animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
