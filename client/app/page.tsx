'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { getRandomPun } from '../utils/puns';
const LandingPage = dynamic(() => import('../components/LandingPage'), { ssr: false });
const Game = dynamic(() => import('../components/Game').then(mod => mod.default), { 
  ssr: false,
  loading: () => <div className="text-white text-center p-4">Loading Game...</div>
});

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpectating, setIsSpectating] = useState(false);
  const [username, setUsername] = useState('');

  const handleJoin = (name: string) => {
    setUsername(name);
    setIsPlaying(true);
    setIsSpectating(false);
  };

  const handleWatch = () => {
     setUsername(`Spectator-${Math.floor(Math.random()*1000)}`);
     setIsPlaying(true);
     setIsSpectating(true);
  };

  const handleQuit = () => {
    setIsPlaying(false);
    setIsSpectating(false);
    setUsername(getRandomPun());
  }

  return (
    <main>
      {!isPlaying ? (
        <LandingPage onJoin={handleJoin} onWatch={handleWatch} />
      ) : (
        <Game username={username} isSpectating={isSpectating} onQuit={handleQuit} onJoinGame={handleJoin} />
      )}
    </main>
  );
}
