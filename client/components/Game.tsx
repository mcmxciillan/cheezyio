'use client';

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { GameScene } from './GameScene';
import HUD from './HUD';
import DeathScreen from './DeathScreen';

interface GameProps {
  username: string;
  isSpectating: boolean;
  onQuit: () => void;
  onJoinGame: (name: string) => void;
}

export default function Game({ username, isSpectating, onQuit }: GameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [gameInstance, setGameInstance] = useState<Phaser.Game | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (gameRef.current) return;

    // Safeguard against 0 dimensions (can cause WebGL FBO errors)
    const width = window.innerWidth > 0 ? window.innerWidth : 1024;
    const height = window.innerHeight > 0 ? window.innerHeight : 768;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.CANVAS, // Force Canvas to avoid WebGL "Incomplete Attachment" errors
      width,
      height,
      parent: 'phaser-game',
      backgroundColor: '#1a1a1a',
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
          gravity: { x: 0, y: 0 },
        },
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [GameScene],
      callbacks: {
        preBoot: (game) => {
           // Pass props to Registry
           game.registry.set('username', username);
           game.registry.set('isSpectating', isSpectating);
        }
      }
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;
    setGameInstance(game); 

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w > 0 && h > 0) {
        game.scale.resize(w, h);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      game.destroy(true);
      gameRef.current = null;
      setGameInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount. Ideally should handle prop changes, but full reload is safer for Phaser.

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black">
      <div
        id="phaser-game"
        className="absolute inset-0 z-0"
      />
      
      {/* UI Overlays */}
      {gameInstance && (
          <>
             <HUD game={gameInstance} username={username} />
             <DeathScreen game={gameInstance} onQuit={onQuit} />
          </>
      )}
    </div>
  );
}
