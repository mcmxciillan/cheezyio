'use client';

import { useState, useEffect } from 'react';
import BannerAd from './BannerAd';
import { getRandomPun } from '../utils/puns';

interface LandingPageProps {
  onJoin: (username: string) => void;
  onWatch: () => void;
}

export default function LandingPage({ onJoin, onWatch }: LandingPageProps) {
  const [username, setUsername] = useState('');
  const [mounted, setMounted] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Random Pun on Mount & Hydration Fix
  useEffect(() => {
    // eslint-disable-next-line
    setUsername(getRandomPun());
    setMounted(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onJoin(username);
    }
  };

  // Prevent hydration mismatch by not rendering until mounted on client
  if (!mounted) {
      return null;
  }

  return (
    <div className="flex flex-row items-center justify-between h-screen w-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black text-white overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
         <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500 rounded-full mix-blend-screen filter blur-3xl animate-blob"></div>
         <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"></div>
         <div className="absolute -bottom-8 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* --- MOBILE LANDSCAPE ADS (Absolute Positioned) --- */}
      
      {/* Top Ad */}
      <div className="hidden landscape:flex lg:landscape:hidden w-full justify-center items-start h-[30px] overflow-hidden z-20 pointer-events-none bg-black/20 backdrop-blur-sm absolute top-0 left-0">
          <div className="transform scale-[0.25] origin-top">
              <BannerAd format="leaderboard" />
          </div>
      </div>

      {/* Bottom Ad */}
      <div className="hidden landscape:flex lg:landscape:hidden w-full justify-center items-end h-[30px] overflow-hidden z-20 pointer-events-none bg-black/20 backdrop-blur-sm absolute bottom-0 left-0">
          <div className="transform scale-[0.25] origin-bottom">
              <BannerAd format="leaderboard" />
          </div>
      </div>

      {/* Left Ad */}
      <div className="hidden landscape:flex lg:landscape:hidden h-full flex-col justify-center items-start w-[40px] overflow-hidden z-20 pointer-events-none bg-black/20 backdrop-blur-sm absolute left-0 top-0 bottom-0">
          <div className="transform scale-[0.25] origin-left">
              <BannerAd format="skyscraper" />
          </div>
      </div>

      {/* Right Ad */}
       <div className="hidden landscape:flex lg:landscape:hidden h-full flex-col justify-center items-end w-[40px] overflow-hidden z-20 pointer-events-none bg-black/20 backdrop-blur-sm absolute right-0 top-0 bottom-0">
            <div className="transform scale-[0.25] origin-right">
               <BannerAd format="skyscraper" />
           </div>
       </div>

      {/* --- DESKTOP ADS --- */}
      {/* Left Ad (Desktop Only) */}
      <div className="hidden lg:flex flex-col justify-center px-4 z-20 h-full">
          <BannerAd format="skyscraper" />
      </div>


      {/* --- MAIN CONTENT --- */}
      
      {/* 1. Mobile Landscape Content (Optimized for Space - Compact) */}
      <div className="hidden landscape:flex lg:landscape:hidden flex-col items-center justify-center w-full h-full p-0 z-30 pt-[30px] pb-[30px] pl-[40px] pr-[40px]">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-2 rounded-xl shadow-2xl w-full h-full flex flex-row gap-12 items-center justify-center">
              {/* Branding Section */}
              <div className="flex flex-col justify-center items-end text-right">
                  <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-1 drop-shadow-sm leading-none">
                  CheezyIO
                  </h1>
                  <p className="text-gray-300 font-light tracking-wide text-xs leading-tight">Enter the grid.<br/>Claim the cheese.</p>
              </div>
              
              {/* Vertical Divider (Optional, visually separating but keeping close) */}
              <div className="w-px h-1/2 bg-white/10"></div>
              
              {/* Form Section */}
              <div className="flex flex-col justify-center w-[280px]">
                  <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
                      <div className="relative w-full">
                          <input
                          type="text"
                          placeholder="Username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          maxLength={15}
                          className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-base transition-all placeholder:text-gray-500 text-center"
                          autoFocus
                          />
                      </div>
                      
                      <button
                          type="submit"
                          disabled={!username.trim()}
                          className="w-full py-2.5 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg font-bold text-lg uppercase tracking-wider hover:from-yellow-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-orange-500/20"
                      >
                          Play
                      </button>

                      <div className="flex gap-2 w-full">
                          <button
                                  type="button"
                                  onClick={onWatch}
                                  className="flex-1 py-2 bg-indigo-600/50 border border-indigo-400/30 rounded-lg font-semibold text-xs hover:bg-indigo-600/80 transition-all duration-200 whitespace-nowrap"
                              >
                                  Watch
                          </button>

                          <button
                                  type="button"
                                  onClick={() => setShowTutorial(true)}
                                  className="flex-1 py-2 bg-green-600/50 border border-green-400/30 rounded-lg font-semibold text-xs hover:bg-green-600/80 transition-all duration-200 whitespace-nowrap"
                              >
                                  Help
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      </div>

      {/* 2. Standard Content (Portrait & Desktop) */}
      <div className="flex landscape:hidden lg:landscape:flex flex-col items-center justify-center z-10 p-8 w-full max-w-md h-full">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl shadow-2xl w-full">
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2 text-center drop-shadow-sm">
            CheezyIO
            </h1>
            <p className="text-gray-300 text-center mb-8 font-light tracking-wide">Enter the grid. Claim the cheese.</p>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="relative">
                <input
                type="text"
                placeholder="Enter your Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={15}
                className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-lg transition-all placeholder:text-gray-500"
                autoFocus
                />
            </div>
            
            <button
                type="submit"
                disabled={!username.trim()}
                className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl font-bold text-xl uppercase tracking-wider hover:from-yellow-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-orange-500/20"
            >
                Play Now
            </button>

            <div className="relative flex items-center justify-center">
                <div className="border-t border-gray-500 w-full absolute"></div>
                <span className="bg-transparent px-2 text-gray-400 text-sm relative z-10 bg-opacity-0">OR</span>
            </div>

            <button
                type="button"
                onClick={onWatch}
                className="w-full py-3 bg-indigo-600/50 border border-indigo-400/30 rounded-xl font-semibold text-lg hover:bg-indigo-600/80 transition-all duration-200"
            >
                Watch Game
            </button>

            <button
                type="button"
                onClick={() => setShowTutorial(true)}
                className="w-full py-3 bg-green-600/50 border border-green-400/30 rounded-xl font-semibold text-lg hover:bg-green-600/80 transition-all duration-200"
            >
                How to Play 🧀
            </button>
            </form>

            <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10 text-center">
                <h3 className="text-yellow-400 font-bold mb-2">🚀 Coming Soon</h3>
                <p className="text-gray-400 text-sm">
                    Get ready for <span className="text-white font-mono">RatRace</span>, <span className="text-white font-mono">LabRat</span>, and <span className="text-white font-mono">BattleRoyale</span> modes!
                </p>
            </div>
        </div>
        
        <div className="mt-8">
            <BannerAd format="leaderboard" />
        </div>
      </div>

    {/* Tutorial Modal */}
    {showTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowTutorial(false)}>
            <div className="bg-gray-900 border border-yellow-500/30 p-8 rounded-2xl max-w-lg w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <h2 className="text-3xl font-bold text-yellow-400 mb-6 flex items-center gap-2">
                    🧀 How to Play
                </h2>
                
                <div className="space-y-4 text-gray-200 mb-8">
                    <div className="flex items-start gap-4">
                        <div className="text-2xl">🖱️</div>
                        <div>
                            <strong className="text-white block">Move</strong>
                            Use your Mouse or Touch to guide your mouse.
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                        <div className="text-2xl">⚡</div>
                        <div>
                            <strong className="text-white block">Boost</strong>
                            Hold <span className="text-yellow-400">Left Click</span> to sprint! (Requires score &gt; 0)
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                        <div className="text-2xl">🍽️</div>
                        <div>
                            <strong className="text-white block">Eat to Grow</strong>
                            Consume cheese and smaller players to get bigger.
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                        <div className="text-2xl">⚠️</div>
                        <div>
                            <strong className="text-white block">Watch Out</strong>
                            Avoid players larger than you (red outline).
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => setShowTutorial(false)}
                    className="w-full py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors"
                >
                    Got it!
                </button>
            </div>
        </div>
    )}

      {/* Right Ad (Desktop) */}
      <div className="hidden lg:flex flex-col justify-center px-4 z-20 h-full">
          <BannerAd format="skyscraper" />
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
