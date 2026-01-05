'use client';

import { useEffect, useState } from 'react';
import * as Phaser from 'phaser';

interface DeathScreenProps {
    game: Phaser.Game | null;
    onQuit: () => void;
}

export default function DeathScreen({ game, onQuit }: DeathScreenProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [stats, setStats] = useState<{ finalScore: number; killer: string; canRevive: boolean } | null>(null);

    useEffect(() => {
        if (!game) return;

        const onGameOver = (data: { finalScore: number; killer: string; canRevive: boolean }) => {
            setStats(data);
            setIsVisible(true);
        };

        game.events.on('gameOver', onGameOver);
        
        // Hide on respawn request success (handled by game logic, but we can listen for reset?)
        // Or just self-manage.
        
        return () => {
            game.events.off('gameOver', onGameOver);
        };
    }, [game]);

    const handleRespawn = () => {
        if (game) {
            game.events.emit('respawn');
            setIsVisible(false);
        }
    };

    if (!isVisible || !stats) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-gray-900 border-2 border-red-500/50 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
                
                <h2 className="text-5xl font-black text-red-500 mb-2 drop-shadow-lg uppercase tracking-wider">Wasted</h2>
                <div className="text-gray-400 text-sm mb-6 uppercase tracking-widest">Game Over</div>
                
                <div className="mb-8 space-y-4">
                    <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                        <div className="text-gray-400 text-xs uppercase mb-1">Killed By</div>
                        <div className="text-2xl font-bold text-white mb-3 text-red-400">{stats.killer}</div>
                        
                        <div className="border-t border-white/10 my-3"></div>
                        
                        <div className="text-gray-400 text-xs uppercase mb-1">Final Mass</div>
                        <div className="text-4xl font-mono font-bold text-yellow-400">{Math.floor(stats.finalScore)}</div>
                    </div>
                </div>

                <div className="space-y-3">
                    <button 
                        onClick={handleRespawn}
                        className="w-full py-4 bg-yellow-500 text-black font-bold text-xl rounded-xl hover:bg-yellow-400 transition-all transform hover:scale-[1.02] shadow-lg shadow-yellow-500/20 active:scale-95"
                    >
                        Respawn
                    </button>
                    
                    <button 
                        onClick={() => { setIsVisible(false); onQuit(); }}
                        className="w-full py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all border border-white/10"
                    >
                        Main Menu
                    </button>
                </div>
            </div>
            <style jsx>{`
                .animate-fade-in { animation: fadeIn 0.3s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            `}</style>
        </div>
    );
}
