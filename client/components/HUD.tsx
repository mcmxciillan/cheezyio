'use client';

import { useState } from 'react';
import { getRandomPun } from '../utils/puns';
import { AudioManager } from '../audio/AudioManager';

interface HUDProps {
  score: number;
  ping: number;
  leaderboard: { name: string; score: number }[];
  isSpectating: boolean;
  onQuit: () => void;
  onJoinGame: (name: string) => void;
  effects?: Record<string, number>;
  killFeed?: {killer: string, victim: string, id: number}[];
  chatMessages?: {id: string, sender: string, message: string}[];
  onSendChat?: (message: string) => void;
  onJoystick?: (rotation: number | null, boost: boolean) => void;
}

export default function HUD({ score, ping, leaderboard, isSpectating, onQuit, onJoinGame, effects = {}, killFeed = [], chatMessages = [], onSendChat, onJoystick }: HUDProps) {
  const [spectatorName, setSpectatorName] = useState('');
  const [localMusicMuted, setLocalMusicMuted] = useState(false);
  const [localSFXMuted, setLocalSFXMuted] = useState(false);
  const [chatInput, setChatInput] = useState('');
  
  // Joystick State
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const joystickRadius = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
      const touch = e.touches[0];
      // Only capture if in bottom-left area
      // Actually let's just use a fixed container for the joystick
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = touch.clientX - rect.left - rect.width/2;
      const y = touch.clientY - rect.top - rect.height/2;
      
      setJoystickActive(true);
      updateJoystick(x, y);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!joystickActive) return;
      const touch = e.touches[0];
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = touch.clientX - rect.left - rect.width/2;
      const y = touch.clientY - rect.top - rect.height/2;
      updateJoystick(x, y);
  };

  const handleTouchEnd = () => {
      setJoystickActive(false);
      setStickPos({ x: 0, y: 0 });
      if (onJoystick) onJoystick(null, false);
  };

  const updateJoystick = (dx: number, dy: number) => {
      const distance = Math.sqrt(dx*dx + dy*dy);
      const angle = Math.atan2(dy, dx);
      
      const clampedDist = Math.min(distance, joystickRadius);
      const stickX = Math.cos(angle) * clampedDist;
      const stickY = Math.sin(angle) * clampedDist;
      
      setStickPos({ x: stickX, y: stickY });
      
      if (onJoystick) {
          onJoystick(angle, distance > joystickRadius * 0.8); // Boost if pushed to edge
      }
  };


  const handleChatSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (chatInput.trim() && onSendChat) {
          onSendChat(chatInput.trim());
          setChatInput('');
          // Blur to return focus to game
          (document.activeElement as HTMLElement)?.blur();
      }
  };

  const handleSpectatorJoin = (e: React.FormEvent) => {
      e.preventDefault();
      if (spectatorName.trim()) {
          onJoinGame(spectatorName);
      }
  }

  // Dispatch events for camera switching
  const handlePrevCam = () => window.dispatchEvent(new CustomEvent('spectate-prev'));
  const handleNextCam = () => window.dispatchEvent(new CustomEvent('spectate-next'));

  const now = Date.now();

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-6 flex flex-col justify-between">
      {/* Top Bar */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
            {!isSpectating && (
                <div className="flex flex-col gap-2">
                    <div className="bg-black/50 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-lg w-fit">
                        <p className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-1">Score</p>
                        <p className="text-4xl font-black text-yellow-400 font-mono tabular-nums leading-none">
                            {score.toLocaleString()}
                        </p>
                    </div>

                    {/* Active Effects */}
                    <div className="flex flex-col gap-1">
                        {Object.entries(effects).map(([type, expiryUrl]) => { // Actually activeEffects maps type -> expiryTime
                            // Typescript fix: expiry is number
                            const expiry = expiryUrl as unknown as number; 
                            if (expiry < now) return null;
                            const timeLeft = Math.max(0, (expiry - now) / 1000);
                            const maxDuration = 10; // Approx
                            const progress = Math.min(100, (timeLeft / maxDuration) * 100);
                            
                            let icon = '?';
                            let color = 'bg-gray-500';
                            if (type === 'speed') { icon = '⚡'; color = 'bg-green-500'; }
                            if (type === 'ghost') { icon = '👻'; color = 'bg-purple-500'; }
                            if (type === 'magnet') { icon = '🧲'; color = 'bg-red-500'; }

                            return (
                                <div key={type} className="bg-black/50 backdrop-blur-md rounded-lg p-2 border border-white/10 flex items-center gap-2">
                                    <span className="text-xl">{icon}</span>
                                    <div className="flex flex-col gap-1 w-24">
                                        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full ${color} transition-all duration-200 ease-linear`} 
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-mono text-white/70 leading-none">{timeLeft.toFixed(1)}s</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            <div className="flex flex-col gap-2 pointer-events-auto">
                 <button 
                     onClick={onQuit}
                     className="bg-red-500/80 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg backdrop-blur-md border border-red-400/30 transition-colors w-fit shadow-lg"
                 >
                     QUIT
                 </button>
                 
                 {/* Audio Controls */}
                 <div className="flex gap-2">
                     {/* Music Toggle */}
                     <button
                         onClick={() => {
                            const muted = AudioManager.getInstance().toggleMusic();
                            setLocalMusicMuted(muted);
                         }}
                         className={`p-2 rounded-lg backdrop-blur-md border border-white/10 transition-colors text-xl ${localMusicMuted ? 'bg-red-500/50 hover:bg-red-500/70' : 'bg-black/50 hover:bg-black/70'}`}
                         title="Toggle Music"
                     >
                         🎵
                     </button>

                     {/* SFX Toggle */}
                     <button
                         onClick={() => {
                            const muted = AudioManager.getInstance().toggleSFX();
                            setLocalSFXMuted(muted);
                         }}
                         className={`p-2 rounded-lg backdrop-blur-md border border-white/10 transition-colors text-xl ${localSFXMuted ? 'bg-red-500/50 hover:bg-red-500/70' : 'bg-black/50 hover:bg-black/70'}`}
                         title="Toggle SFX"
                     >
                         🔊
                     </button>
                 </div>
            </div>
        </div>

        <div className="flex flex-col items-end gap-2">
            <div className="bg-black/50 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${ping < 100 ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
               <span className="text-xs font-mono text-gray-300">{ping}ms</span>
            </div>

            {/* Kill Feed */}
            <div className="flex flex-col items-end gap-1 min-w-[200px] pointer-events-none">
                {killFeed.map((kill) => (
                    <div key={kill.id} className="bg-black/60 backdrop-blur-sm rounded px-2 py-1 border border-white/5 text-xs animate-fade-in-down">
                        <span className="font-bold text-green-400">{kill.killer}</span>
                        <span className="text-gray-400 mx-1">ate</span>
                        <span className="font-bold text-red-400">{kill.victim}</span>
                    </div>
                ))}
            </div>

            {/* Leaderboard */}
            <div className="bg-black/50 backdrop-blur-md rounded-xl p-3 border border-white/10 min-w-[200px]">
                <p className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-2 border-b border-white/5 pb-1">Leaderboard</p>
                <div className="space-y-1">
                    {leaderboard.map((p, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                            <span className="text-white/80 font-medium truncate max-w-[120px]">
                                {i + 1}. {p.name}
                            </span>
                            <span className="text-yellow-400 font-mono text-xs">{p.score}</span>
                        </div>
                    ))}
                    {leaderboard.length === 0 && <span className="text-white/30 text-xs italic">Waiting for players...</span>}
                </div>
            </div>
        </div>
      </div>

      {/* Spectator Controls */}
      {isSpectating && (
          <div className="absolute top-24 left-1/2 transform -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-4">
              <div className="flex items-center gap-4">
                  <button onClick={handlePrevCam} className="bg-black/50 hover:bg-black/70 text-white p-4 rounded-full backdrop-blur-md border border-white/20 transition-all">
                      ←
                  </button>
                  <div className="bg-black/60 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-2xl">
                      <h2 className="text-xl font-bold text-white mb-4 text-center">Spectating</h2>
                      <form onSubmit={handleSpectatorJoin} className="flex flex-col gap-3">
                          <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Enter Name to Join" 
                                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 flex-1 min-w-0"
                                value={spectatorName}
                                onChange={(e) => setSpectatorName(e.target.value)}
                                maxLength={15}
                            />
                            <button
                                type="button"
                                onClick={() => setSpectatorName(getRandomPun())}
                                className="bg-white/10 hover:bg-white/20 text-yellow-400 font-bold px-3 py-2 rounded-lg border border-white/20 transition-colors text-lg"
                                title="Generate Random Name"
                            >
                                🎲
                            </button>
                          </div>
                          <button 
                              type="submit" 
                              disabled={!spectatorName.trim()}
                              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              JOIN GAME
                          </button>
                      </form>
                  </div>
                  <button onClick={handleNextCam} className="bg-black/50 hover:bg-black/70 text-white p-4 rounded-full backdrop-blur-md border border-white/20 transition-all">
                      →
                  </button>
              </div>
              <p className="text-white/50 text-sm shadow-black drop-shadow-md">Use arrow buttons to switch players</p>
          </div>
      )}


      
      {/* Chat System (Bottom Left) */}
      {!isSpectating && (
        <div className="absolute bottom-6 left-6 w-80 pointer-events-auto flex flex-col gap-2">
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto no-scrollbar mask-gradient-b">
                {chatMessages.map((msg) => (
                    <div key={msg.id} className="text-sm shadow-sm">
                        <span className="font-bold text-yellow-400 mr-2 drop-shadow-md">{msg.sender}:</span>
                        <span className="text-white drop-shadow-md">{msg.message}</span>
                    </div>
                ))}
            </div>
            <form onSubmit={handleChatSubmit}>
                <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Press Enter to chat..."
                    className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded px-3 py-1.5 text-white placeholder:text-white/30 text-sm focus:outline-none focus:bg-black/60 focus:border-yellow-400 transition-colors"
                />
            </form>
        </div>
      )}

      {/* Mobile Joystick (Bottom Right) */}
      {!isSpectating && (
          <div 
            className="absolute bottom-8 right-8 w-32 h-32 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 pointer-events-auto touch-none flex items-center justify-center"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
              <div 
                className="w-12 h-12 bg-white/50 rounded-full shadow-lg transition-transform duration-75"
                style={{ transform: `translate(${stickPos.x}px, ${stickPos.y}px)` }}
              />
          </div>
      )}

      {/* Bottom Right - Controls Hint (Only in game - hide on touch?) */}
      {!isSpectating && (
        <div className="self-end bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/5 pointer-events-none hidden md:block">
            <div className="grid grid-cols-3 gap-1 text-center">
                <div />
                <div className="w-8 h-8 border border-white/20 rounded flex items-center justify-center text-white/50 text-xs">W</div>
                <div />
                <div className="w-8 h-8 border border-white/20 rounded flex items-center justify-center text-white/50 text-xs">A</div>
                <div className="w-8 h-8 border border-white/20 rounded flex items-center justify-center text-white/50 text-xs">S</div>
                <div className="w-8 h-8 border border-white/20 rounded flex items-center justify-center text-white/50 text-xs">D</div>
            </div>
        </div>
      )}
    </div>
  );
}
