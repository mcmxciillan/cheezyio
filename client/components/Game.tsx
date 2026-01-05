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

const Game = ({ username, isSpectating, onQuit, onJoinGame }: GameProps) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [score, setScore] = useState(0);
  const [ping, setPing] = useState(0);
  const [leaderboard, setLeaderboard] = useState<{name: string, score: number}[]>([]);
  const [effects, setEffects] = useState<Record<string, number>>({});
  const [killFeed, setKillFeed] = useState<{killer: string, victim: string, id: number}[]>([]);
  const [chatMessages, setChatMessages] = useState<{id: string, sender: string, message: string}[]>([]);
  
  // Local Spectator State (to handle mid-game switch)
  const [localSpectating, setLocalSpectating] = useState(isSpectating);

  useEffect(() => {
    setLocalSpectating(isSpectating);
  }, [isSpectating]);
  
  // Death Screen State
  const [deathInfo, setDeathInfo] = useState<{ finalScore: number, killer: string, canRevive: boolean } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !gameRef.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        scale: {
            mode: Phaser.Scale.RESIZE,
            width: '100%',
            height: '100%',
        },
        parent: 'phaser-game',
        backgroundColor: '#1a1a2e',
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
          },
        },
        scene: [GameScene],
        callbacks: {
          preBoot: (game) => {
             game.registry.set('username', username);
             game.registry.set('isSpectating', isSpectating);
             // Setup event listeners for HUD updates
             game.events.on('updateScore', (newScore: number) => setScore(newScore));
             game.events.on('updatePing', (newPing: number) => setPing(newPing));
             game.events.on('updateLeaderboard', (lb: any[]) => setLeaderboard(lb));
             game.events.on('updateEffects', (eff: Record<string, number>) => setEffects(eff));
             
             game.events.on('playerKilled', (data: {killer: string, victim: string}) => {
                 const id = Date.now() + Math.random(); // Unique ID
                 const newItem = { ...data, id };
                 
                 setKillFeed(prev => {
                     return [...prev.slice(-4), newItem]; // Keep last 5
                 });
                 
                 // Auto remove after 5s by ID
                 setTimeout(() => {
                     setKillFeed(prev => prev.filter(item => item.id !== id));
                 }, 5000);
             });
              
              game.events.on('chat', (msg: {id: string, sender: string, message: string}) => {
                  setChatMessages(prev => [...prev.slice(-19), msg]); // Keep last 20
              });

              // Handle Game Over
              game.events.on('gameOver', (data: { finalScore: number, killer: string, canRevive: boolean }) => {
                 setDeathInfo(data);
              });
          }
        }
      };

      gameRef.current = new Phaser.Game(config);
    }

    // Cleanup
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [username, isSpectating]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
        <HUD 
          score={score} 
          ping={ping} 
          leaderboard={leaderboard} 
          isSpectating={isSpectating || localSpectating}
          onQuit={onQuit}
          onJoinGame={onJoinGame}
          effects={effects}
          killFeed={killFeed}
          chatMessages={chatMessages}
          onSendChat={(msg) => {
              if (gameRef.current) {
                  const scene = gameRef.current.scene.scenes[0] as GameScene;
                  scene.sendChat(msg);
              }
          }}
          onJoystick={(rotation, boost) => {
              if (gameRef.current) {
                  const scene = gameRef.current.scene.scenes[0] as GameScene;
                  scene.setJoystickInput(rotation, boost);
              }
          }}
        />

        {deathInfo && (
            <DeathScreen
                finalScore={deathInfo.finalScore}
                killer={deathInfo.killer}
                canRevive={deathInfo.canRevive}
                onRespawn={(type) => {
                    if (gameRef.current) {
                        const scene = gameRef.current.scene.scenes[0] as GameScene;
                        scene.requestRespawn(type);
                    }
                    setLocalSpectating(false);
                    setDeathInfo(null);
                }}
                onSpectate={() => {
                    if (gameRef.current) {
                         const scene = gameRef.current.scene.scenes[0] as GameScene;
                         scene.enableSpectatorMode();
                    }
                    setLocalSpectating(true);
                    setDeathInfo(null);
                }}
            />
        )}

        <div id="phaser-game" className="w-full h-full" />
    </div>
  );
};

export default Game;
