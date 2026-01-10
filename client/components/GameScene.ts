import * as Phaser from 'phaser';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { io, Socket } from 'socket.io-client';
import parser from 'socket.io-msgpack-parser';
import { AudioManager } from '../audio/AudioManager';

export class GameScene extends Phaser.Scene {
  private socket!: Socket;
  private players: Record<string, Phaser.GameObjects.Sprite> = {};
  private cheese: Record<string, Phaser.GameObjects.Sprite> = {};
  private myId: string | null = null;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private lastInputTime: number = 0;

  constructor() {
    super('GameScene');
  }

  public requestRespawn(type: 'normal' | 'ad') {
    if (this.socket) {
      this.socket.emit('respawn', type);
    }

    // Reset Spectator Mode
    this.isSpectating = false;
    this.spectatingTargetId = null;
    this.registry.set('isSpectating', false);
    
    window.removeEventListener('spectate-prev', this.onSpectatePrev);
    window.removeEventListener('spectate-next', this.onSpectateNext);

    // Reset Camera
    this.cameras.main.setZoom(1);
  }

  public enableSpectatorMode() {
    this.isSpectating = true;
    this.registry.set('isSpectating', true);
    
    window.addEventListener('spectate-prev', this.onSpectatePrev);
    window.addEventListener('spectate-next', this.onSpectateNext);
  }

  preload() {
    // Backgrounds
    // this.load.image('background-default', '/assets/background-texture.png'); // DELETED
    this.load.image('checkers-dark', '/assets/checkers-dark.png');
    this.load.image('checkers-darkest', '/assets/checkers-darkest.png');
    this.load.image('checkers-flat', '/assets/checkers-flat.png');
    this.load.image('checkers-raised', '/assets/checkers-raised.png');

    // Mouse Skins
    const skins = ['bmouse', 'gmouse', 'wmouse'];
    const dirs = ['left', 'right', 'front', 'back'];
    skins.forEach((skin) => {
      dirs.forEach((dir) => {
        this.load.image(`${skin}-${dir}`, `/assets/${skin}-${dir}.png`);
      });
    });

    // Cheese types
    this.load.image('crumbs', '/assets/cheese-crumbs.png');
    this.load.image('wedge', '/assets/cheese-wedge.png');
    this.load.image('block', '/assets/cheese-block.png');
    this.load.image('wheel', '/assets/cheese-wheel.png');
  }

  private isSpectating: boolean = false;
  private spectatingTargetId: string | null = null;

  create() {
    // Use relative path for socket connection (works for both dev proxy and prod static file serving)
    // If dev, we might need explicit localhost if ports differ, but for prod single-container it's key.
    // Better strategy: Use NEXT_PUBLIC_API_URL if defined, else default to window origin
    const url =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      (window.location.hostname === 'localhost' ? 'http://localhost:8000' : undefined);
    this.socket = io(url || undefined, {
      parser,
    });

    // Check Spectator Mode
    this.isSpectating = this.registry.get('isSpectating') || false;

    // Setup World & Background
    const backgrounds = ['checkers-dark', 'checkers-darkest', 'checkers-flat', 'checkers-raised'];
    const randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)];

    this.add.tileSprite(0, 0, 4000, 4000, randomBg).setOrigin(0, 0);
    this.cameras.main.setBounds(0, 0, 4000, 4000);

    // Retrieve username from registry
    const username = this.registry.get('username') || 'Anonymous';

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.myId = this.socket.id || null;
    });

    this.socket.on('welcome', (data: { version: string }) => {
      const CLIENT_VERSION = '2.1';
      if (data.version !== CLIENT_VERSION) {
        console.warn(`Version mismatch! Server: ${data.version}, Client: ${CLIENT_VERSION}`);
        alert('Game updated! Reloading...');
        window.location.reload();
      } else {
        // Only join if playing (and version is good)
        if (!this.isSpectating) {
          this.socket.emit('join', { name: username });
        }
      }
    });

    this.socket.on('state', (state: any) => {
      this.handleState(state);
    });

    // Score updates
    this.socket.on('updateScore', (score: number) => {
      this.game.events.emit('updateScore', score);
    });

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // Spectator Controls (Event Listeners from HUD dispatches)
    if (this.isSpectating) {
      window.addEventListener('spectate-prev', this.onSpectatePrev);
      window.addEventListener('spectate-next', this.onSpectateNext);
    }

    // Clean up previous listeners

    // Clean up previous listeners
    this.scale.off('resize');

    // Handle Resize
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const { width, height } = gameSize;
      this.cameras.main.setViewport(0, 0, width, height);
    });

    // --- Juice: Particle Managers ---
    this.createParticleSystems();

    // Listen for Kill Feed & Death Explosions
  this.socket.on('playerKilled', (data: { killer: string; victim: string; x?: number; y?: number }) => {
    if (data.x !== undefined && data.y !== undefined) {
       this.explosionEmitter.explode(20, data.x, data.y);
       // Play sound?
       const isMe = data.victim === (this.registry.get('username') || 'Anonymous');
       // Actually username isn't unique ID. 
       // We don't have ID here easily unless passed. Assumed handled by gameOver event for self.
    }
    this.game.events.emit('playerKilled', data);
  });

    // Listen for Chat
    this.socket.on('chat', (msg: any) => {
      this.game.events.emit('chat', msg);
    });

    // Handle Game Over
    this.socket.on(
      'gameOver',
      (data: { finalScore: number; killer: string; canRevive: boolean }) => {
        this.game.events.emit('gameOver', data);
      },
    );

    // Handle Respawn Request (from DeathScreen)
    this.game.events.on('respawn', () => {
        this.requestRespawn('normal');
    });

    // Leader Crown
    this.crownText = this.add
      .text(0, 0, '👑', {
        fontSize: '32px',
      })
      .setOrigin(0.5, 1)
      .setDepth(200); // High depth

    // Cleanup on destroy
    this.events.on(Phaser.Scenes.Events.DESTROY, () => {
      if (this.socket) {
        this.socket.disconnect();
      }
      window.removeEventListener('spectate-prev', this.onSpectatePrev);
      window.removeEventListener('spectate-next', this.onSpectateNext);
    });

    // Minimap Graphics
    this.minimapGraphics = this.add.graphics();
    this.minimapGraphics.setScrollFactor(0); // Fixed to camera
    this.minimapGraphics.setDepth(100); // Overlay on top

    // Start Background Music
    AudioManager.getInstance().loadAndPlayMusic('/assets/cheezylofi.wav');
  }

  private trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private explosionEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private eatEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private powerupEmitter!: Phaser.GameObjects.Particles.ParticleEmitter; // New emitter for powerups
  private minimapGraphics!: Phaser.GameObjects.Graphics; // New minimap graphics
  private crownText!: Phaser.GameObjects.Text; // Leader Crown
  private powerups: Record<string, Phaser.GameObjects.Text> = {}; // PowerUp Sprites (Text)
  private magnetGlow: Phaser.GameObjects.Arc | null = null;

  private createParticleSystems() {
    // 1. Boost Trail (Smoke/Dust)
    this.trailEmitter = this.add.particles(0, 0, 'crumbs', {
      speed: { min: 20, max: 50 },
      scale: { start: 0.05, end: 0 }, // Reduced from 0.5 to match sprite scale
      alpha: { start: 0.5, end: 0 },
      lifespan: 400,
      frequency: -1,
      blendMode: 'ADD',
      tint: 0xcccccc,
    });

    // 2. Death Explosion (Bloody/Cheesy mess)
    this.explosionEmitter = this.add.particles(0, 0, 'block', {
      speed: { min: 50, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.08, end: 0 }, // Reduced from 0.8
      lifespan: 600,
      gravityY: 0,
      frequency: -1,
      quantity: 15,
    });

    // 3. Eat "Pop" (Small sparks)
    this.eatEmitter = this.add.particles(0, 0, 'crumbs', {
      speed: { min: 30, max: 80 },
      scale: { start: 0.05, end: 0 }, // Reduced from 1.0
      lifespan: 200,
      frequency: -1,
      quantity: 3, // Reduced quantity
      blendMode: 'ADD',
      tint: 0xffff00,
    });

    // 4. PowerUp Collection (Burst)
    this.powerupEmitter = this.add.particles(0, 0, 'crumbs', {
      speed: { min: 50, max: 150 },
      scale: { start: 0.1, end: 0 },
      lifespan: 500,
      frequency: -1,
      quantity: 20,
      blendMode: 'ADD',
    });
  }

  // Helper to spawn boost particles for a player
  public sendChat(message: string) {
    if (this.socket) {
      this.socket.emit('chat', message);
    }
  }

  // Joystick Input
  private joystickRotation: number | null = null;
  private joystickBoosting: boolean = false;

  public setJoystickInput(rotation: number | null, isBoosting: boolean) {
    this.joystickRotation = rotation;
    this.joystickBoosting = isBoosting;
  }

  private spawnBoostParticles(player: Phaser.GameObjects.Sprite, isBoosting: boolean) {
    // Check if player has score > 0 (Mass required to boost)
    const score = (player as any).score || 0;
    if (isBoosting && score > 0) {
      // Emit behind the player
      // Sprite is rotated -90deg (-PI/2) relative to physics.
      // Physics Forward = rotation + PI/2.
      // Physics Backward = rotation + PI/2 + PI = rotation + 3PI/2 = rotation - PI/2.
      const angle = player.rotation - Math.PI / 2;
      const dist = player.displayWidth / 2;
      const x = player.x + Math.cos(angle) * dist;
      const y = player.y + Math.sin(angle) * dist;

      this.trailEmitter.emitParticleAt(x, y, 1);
    }
  }

  // Bound Handlers for Event Listeners
  private onSpectatePrev = () => this.switchSpectatorTarget(-1);
  private onSpectateNext = () => this.switchSpectatorTarget(1);

  private switchSpectatorTarget(direction: number) {
    const ids = Object.keys(this.players);
    if (ids.length === 0) return;

    let currentIndex = this.spectatingTargetId ? ids.indexOf(this.spectatingTargetId) : 0;
    if (currentIndex === -1) currentIndex = 0;

    let newIndex = currentIndex + direction;
    if (newIndex >= ids.length) newIndex = 0;
    if (newIndex < 0) newIndex = ids.length - 1;

    this.spectatingTargetId = ids[newIndex];
    
    // Force camera update immediately
    if (this.players[this.spectatingTargetId]) {
        this.cameras.main.startFollow(this.players[this.spectatingTargetId]);
    }
  }

  update() {
    if (!this.sys || !this.sys.isActive()) return;

    if (this.isSpectating) {
      // Spectator Camera Logic
      if (!this.spectatingTargetId || !this.players[this.spectatingTargetId]) {
         // Try to find a valid target
         const ids = Object.keys(this.players);
         if (ids.length > 0) {
           this.spectatingTargetId = ids[0];
           this.cameras.main.startFollow(this.players[this.spectatingTargetId]);
         }
      } else {
          // Ensure we are following the target (in case of respawn/reconnect)
          // But don't call startFollow every frame if already following correctly.
          // simpler: just ensure target exists. startFollow lasts until stopFollow.
          // We call `startFollow` in switchSpectatorTarget and initial find.
          // So we don't need to do anything here except handle "lost target".
      }
      return;
    }

    if (!this.myId || !this.players[this.myId]) return;

    const myPlayer = this.players[this.myId];
    const pointer = this.input.activePointer;

    // Check Keyboard Input (WASD / Arrows)
    const cursors = this.input.keyboard!.createCursorKeys();
    const keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE') as any;

    let kx = 0;
    let ky = 0;

    if (cursors.left.isDown || keys.A.isDown) kx -= 1;
    if (cursors.right.isDown || keys.D.isDown) kx += 1;
    if (cursors.up.isDown || keys.W.isDown) ky -= 1;
    if (cursors.down.isDown || keys.S.isDown) ky += 1;

    // Boost logic: Mouse Click OR Spacebar
    const isBoosting = pointer.isDown || cursors.space.isDown || keys.SPACE.isDown;

    // 4. Send Input to Server (throttled)
    const now = Date.now();
    if (now - this.lastInputTime > 50) {
      // 20 updates per second
      let rotation = 0;

      if (this.joystickRotation !== null) {
        rotation = this.joystickRotation;
      } else {
        rotation = Phaser.Math.Angle.Between(
          myPlayer.x,
          myPlayer.y,
          this.input.activePointer.worldX,
          this.input.activePointer.worldY,
        );
      }

      // Boosting logic: Spacebar OR Joystick Boost (simulated by outer ring) OR Mouse Click (Left or Right)
      const isBoosting =
        this.cursors.space.isDown ||
        this.input.activePointer.isDown || 
        this.joystickBoosting;

      // Immediate Client-Side Rotation Update
      myPlayer.setRotation(rotation - Math.PI / 2);

      this.socket.emit('action', { rotation, boost: isBoosting });
    }

    // Self-Boost Particles (Client Side Prediction)
    this.spawnBoostParticles(myPlayer, isBoosting);

    // 5. Client-Side Prediction for Cheese Collection (Audio/Visuals)
    this.checkLocalCollisions(myPlayer);

    // Update Minimap
    this.drawMinimap(this.players);
  }

  private checkLocalCollisions(myPlayer: Phaser.GameObjects.Sprite) {
    if (this.isSpectating) return;

    const playerX = myPlayer.x;
    const playerY = myPlayer.y;
    const playerRadius = myPlayer.displayWidth / 2;

    // Determine pickup range (Normal vs Magnet)
    // We need to know if we have magnet active.
    // Since we don't store activeEffects on the sprite efficiently, we can check the magnetGlow visibility or a stored property.
    // But simplest is to check if magnetGlow is visible.
    // Range: Default is R + 20 (cheese radius approx). Magnet is 400.

    // Determine pickup range
    // Magnet only pulls cheese closer, collision is still physical contact.
    // Use a generous buffer for lag compensation since we now catch prediction errors via reconciliation.
    const pickupRange = playerRadius + 50;

    Object.keys(this.cheese).forEach((id) => {
      const cheese = this.cheese[id];
      if (!cheese.visible) return; // Already collected locally

      const dx = playerX - cheese.x;
      const dy = playerY - cheese.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < pickupRange) {
        // PREDICT: We ate it!
        // 1. Play Sound
        AudioManager.getInstance().playPop();

        // 2. Play Particles
        this.eatEmitter.explode(5, cheese.x, cheese.y);

        // 3. Hide Sprite (Server will remove it later)
        cheese.setVisible(false);
        (cheese as any).pendingEat = Date.now(); // Mark as eagerly eaten
      }
    });

    // Predict PowerUp Collection
    Object.keys(this.powerups).forEach((id) => {
        const p = this.powerups[id];
        if (!p.visible) return;
        
        const dx = playerX - p.x;
        const dy = playerY - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < playerRadius + 30) {
            // Predict Pickup
            AudioManager.getInstance().playPop();
            this.powerupEmitter.explode(20, p.x, p.y);
            this.cameras.main.shake(200, 0.005);
            p.setVisible(false);
        }
    });
  }

  private drawMinimap(players: Record<string, Phaser.GameObjects.Sprite>) {
    if (!this.minimapGraphics) return;
    this.minimapGraphics.clear();

    // Minimap Config
    const mapSize = 200;
    const margin = 20;
    const x = this.cameras.main.width - mapSize - margin; // Bottom Right
    const y = this.cameras.main.height - mapSize - margin;
    const worldSize = 4000;
    const scale = mapSize / worldSize;

    // Background
    this.minimapGraphics.fillStyle(0x000000, 0.5);
    this.minimapGraphics.fillRect(x, y, mapSize, mapSize);
    this.minimapGraphics.lineStyle(2, 0xffffff, 0.5);
    this.minimapGraphics.strokeRect(x, y, mapSize, mapSize);

    // Draw PowerUps
    this.minimapGraphics.fillStyle(0xffff00, 1); // Yellow
    Object.values(this.powerups).forEach((p) => {
      this.minimapGraphics.fillCircle(x + p.x * scale, y + p.y * scale, 3);
    });

    // Draw Players
    Object.keys(players).forEach((id) => {
      const p = players[id];
      const isMe = id === this.myId;
      const color = isMe ? 0x00ff00 : 0xff0000; // Green me, Red others
      this.minimapGraphics.fillStyle(color, 1);
      this.minimapGraphics.fillCircle(x + p.x * scale, y + p.y * scale, isMe ? 4 : 2);
    });
  }

  private handleState(state: any) {
    if (!this.sys || !this.sys.isActive()) return;

    const serverPlayers = state.players;
    const now = Date.now(); // Current game time for effect expiry

    // DEBUG: Log state occasionally
    // if (Math.random() < 0.05) {
    //   console.log('[GameScene] State received:', {
    //     playerCount: Object.keys(serverPlayers).length,
    //     myId: this.myId,
    //     sample: Object.values(serverPlayers)[0],
    //   });
    // }

    // Update or create players
    Object.keys(serverPlayers).forEach((id) => {
      const pData = serverPlayers[id];
      if (this.players[id]) {
        const playerSprite = this.players[id];
        // Store score for logic usage
        (playerSprite as any).score = pData.score || 0;
        
        // Smooth interpolation of position
        this.tweens.add({
          targets: playerSprite,
          x: pData.x,
          y: pData.y,
          duration: 50,
          ease: 'Linear',
        });

        // Update rotation for other players
        if (id !== this.myId) {
          playerSprite.setRotation(pData.rotation - Math.PI / 2);
        }

        // Other Players Boost Particles
        if (pData.boosting) {
          this.spawnBoostParticles(playerSprite, true);
        }

        // Update Scale dynamically based on radius
        if (pData.radius) {
          const targetScale = (pData.radius / 20) * 0.375;
          playerSprite.setScale(targetScale);
        }

        // --- Ninja Clones Rendering ---
        if (pData.ninjaState) {
          this.updateNinjaClones(id, pData, playerSprite);
        } else {
          // Cleanup if ninja state removed
          this.cleanupClones(id);
        }

        // --- Power-Up Visual Updates ---
        // Reset visual effects first
        playerSprite.setAlpha(1);
        playerSprite.setTint(0xffffff);

        if (pData.activeEffects) {
          // Ghost effect: make player semi-transparent
          if (pData.activeEffects.ghost && pData.activeEffects.ghost > now) {
            if (id === this.myId) {
              playerSprite.setAlpha(0.5); // I see myself as ghost
            } else {
              // Logic for opponents:
              // If close, shimmer into view (transparency gradient)
              // If far, invisible (alpha 0)
              let targetAlpha = 0;
              if (this.myId && this.players[this.myId]) {
                const myP = this.players[this.myId];
                const dx = myP.x - playerSprite.x;
                const dy = myP.y - playerSprite.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Max visibility range: 250px
                // Max alpha: 0.3 (Never full visibility)
                if (dist < 250) {
                  targetAlpha = 0.3 * (1 - dist / 250);
                }
              }
              playerSprite.setAlpha(targetAlpha);
            }
          }
          // Speed effect: tint player green
          if (pData.activeEffects.speed && pData.activeEffects.speed > now) {
            playerSprite.setTint(0x00ff00); // Green tint
          }

          // Magnet Effect: Pulsing Glow
          if (id === this.myId) {
            if (pData.activeEffects.magnet && pData.activeEffects.magnet > now) {
              if (!this.magnetGlow) {
                this.magnetGlow = this.add.arc(0, 0, 60, 0, 360, false, 0xffff00, 0.3);
                this.magnetGlow.setDepth(5); // Below player (player depth default is usually higher or we set it?) Player depth isn't explicitly set high except leader.
                // Let's ensure player is above.
                playerSprite.setDepth(10);

                this.tweens.add({
                  targets: this.magnetGlow,
                  scale: 1.5,
                  alpha: 0.1,
                  duration: 800,
                  yoyo: true,
                  repeat: -1,
                });
              }
              this.magnetGlow.setVisible(true);
              this.magnetGlow.setPosition(playerSprite.x, playerSprite.y);
            } else {
              if (this.magnetGlow) this.magnetGlow.setVisible(false);
            }
          }
        }

        // Emit active effects for HUD if it's me
        if (id === this.myId) {
          this.game.events.emit('updateEffects', pData.activeEffects || {});
        }
      } else {
        // Use skin from server, default to brown
        const skin = pData.skin || 'bmouse';
        // Use single base asset (front) and rotate it
        const sprite = this.add.sprite(pData.x, pData.y, `${skin}-front`);
        sprite.setRotation(pData.rotation || 0);
        sprite.setScale(0.375);
        sprite.setDepth(20); // Ensure players are above background/checkers
        this.players[id] = sprite;
      }
    });

    // Manage Local Player Boost Sound
    if (this.myId && serverPlayers[this.myId] && !this.isSpectating) {
      if (serverPlayers[this.myId].boosting) {
        AudioManager.getInstance().startBoost();
      } else {
        AudioManager.getInstance().stopBoost();
      }
    } else {
      AudioManager.getInstance().stopBoost(); // Ensure it stops if dead/spectating
    }

    // Remove disconnected/out-of-view players (Silent Removal for AOI)
    Object.keys(this.players).forEach((id) => {
      if (!serverPlayers[id]) {
        // Ninja Cleanup
        this.cleanupClones(id);

        this.players[id].destroy();
        delete this.players[id];

        // If we were watching this player, reset target
        if (this.spectatingTargetId === id) {
          this.spectatingTargetId = null;
        }
      }
    });

    // Update Cheese
    const serverCheese = state.cheese || {};
    Object.keys(serverCheese).forEach((id) => {
      const cData = serverCheese[id];
      if (this.cheese[id]) {
        // Reconciliation: If server says it exists, but we hid it (predicted eat), restore it!
        // This handles cases where we thought we ate it, but server disagreed (lag/distance).
        if (!this.cheese[id].visible) {
             const pendingEat = (this.cheese[id] as any).pendingEat || 0;
             if (Date.now() - pendingEat > 500) {
                 // Only restore if it's been hidden for > 500ms (Lag threshold)
                 // If < 500ms, assume server just hasn't processed the eat yet.
                 this.cheese[id].setVisible(true);
                 this.cheese[id].setAlpha(1); // Ensure opacity if faded
             }
        }
        
        // Update Position (CRITICALLY NEEDED FOR MAGNET)
        // Lerp for smoothness? Or just hard set. Cheese doesn't move fast usually.
        // Magnet moves it fast.
        const cSprite = this.cheese[id];
        // Only tween if moved significantly to avoid jitter?
        // Simple tween is best.
        this.tweens.add({
            targets: cSprite,
            x: cData.x,
            y: cData.y,
            duration: 100, // Slightly slower than tick (50ms) to smooth it out
        });
      } else {
        // Map type to texture key, default to 'crumbs' if undefined
        const texture = cData.type || 'crumbs';
        const sprite = this.add.sprite(cData.x, cData.y, texture);
        // Adjust scale of legacy assets if needed
        sprite.setScale(0.025);
        this.cheese[id] = sprite;
      }
    });

    Object.keys(this.cheese).forEach((id) => {
      if (!serverCheese[id]) {
        const cheeseSprite = this.cheese[id];

        // Only play particles/sound if it wasn't already collected locally (visible = true)
        // If visible=false, we already played the effect in checkLocalCollisions()
        if (cheeseSprite.visible) {
          this.eatEmitter.explode(5, cheeseSprite.x, cheeseSprite.y);

          // Fallback: If I ate it but missed prediction (lag/fast move), play sound here?
          // Risk: Double audio.
          // Better: Trust prediction. If prediction failed, it's a silent pickup (rare) or user hears it late.
          // Actually, let's keep it simple: server event = particles for everyone else.
        }

        cheeseSprite.destroy();
        delete this.cheese[id];
      }
    });

    // Update PowerUps
    const serverPowerups = state.powerups || {};
    Object.keys(serverPowerups).forEach((id) => {
      const pData = serverPowerups[id];
      if (this.powerups[id]) {
        // No update needed (static usually)
      } else {
        // Create Text Emoji
        let symbol = '❓';
        if (pData.type === 'speed') symbol = '⚡';
        if (pData.type === 'ghost') symbol = '👻';
        if (pData.type === 'magnet') symbol = '🧲';
        if (pData.type === 'ninja') symbol = '🥷';

        const text = this.add.text(pData.x, pData.y, symbol, { font: '40px Arial' }).setOrigin(0.5);

        // Add bobbing tween
        this.tweens.add({
          targets: text,
          y: pData.y - 10,
          duration: 1000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        this.powerups[id] = text;
      }
    });

    Object.keys(this.powerups).forEach((id) => {
      if (!serverPowerups[id]) {
        const p = this.powerups[id];

        // Visual Juice: Particles
        this.powerupEmitter.explode(20, p.x, p.y);
        this.cameras.main.shake(200, 0.005); // Subtle shake

        // Audio: ONLY play if local prediction didn't handle it?
        // Actually, preventing double audio is consistent with cheese logic.
        // If visible=false, we predicted it (and played audio).
        // If visible=true, someone else took it (or we missed prediction).
        // For PowerUps, global sound is confusing ("erroneous sounds").
        // So ONLY play sound if we missed prediction AND it was close to us?
        // Or just don't play sound for others. Just particles.
        
        // Remove global audio pop here.
        // AudioManager.getInstance().playPop();

        p.destroy();
        delete this.powerups[id];
      }
    });

    // Calculate Leaderboard (Top 5)
    // serverPlayers is { id: PlayerData }
    const leaderboard = Object.values(serverPlayers)
      .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
      .slice(0, 5)
      .map((p: any) => ({ name: p.name, score: p.score || 0 }));

    this.game.events.emit('updateLeaderboard', leaderboard);

    // Camera follow local player logic (Normal Mode)
    // In Spectator mode, this is handled in update()
    if (!this.isSpectating && this.myId && this.players[this.myId]) {
      this.cameras.main.startFollow(this.players[this.myId]);

      const myData = serverPlayers[this.myId];
      if (myData) {
        const score = myData.score || 0;
        const radius = 20 + Math.sqrt(score);

        // Zoom formula: 1.0 at radius 20. 0.5 at radius 40.
        let targetZoom = 20 / radius;

        // Calculate min zoom to fit world
        const minZoomX = this.cameras.main.width / 4000;
        const minZoomY = this.cameras.main.height / 4000;
        const minZoom = Math.max(minZoomX, minZoomY); // Fit either width or height? Usually max to cover shortest side or min to cover longest?
        // "Never get any bigger than game board": we shouldn't see gray space.
        // So we need Zoom >= Viewport / WorldSize.

        targetZoom = Math.max(minZoom, Math.min(1.0, targetZoom)); // Clamp zoom

        this.cameras.main.setZoom(Phaser.Math.Linear(this.cameras.main.zoom, targetZoom, 0.05));
      }
    } else if (
      this.isSpectating &&
      this.spectatingTargetId &&
      serverPlayers[this.spectatingTargetId]
    ) {
      // Also zoom for spectator target
      const targetData = serverPlayers[this.spectatingTargetId];
      if (targetData) {
        const score = targetData.score || 0;
        const radius = 20 + Math.sqrt(score);
        let targetZoom = 20 / radius;
        const minZoomX = this.cameras.main.width / 4000;
        const minZoomY = this.cameras.main.height / 4000;
        const minZoom = Math.max(minZoomX, minZoomY);

        targetZoom = Math.max(minZoom, Math.min(1.0, targetZoom));
        this.cameras.main.setZoom(Phaser.Math.Linear(this.cameras.main.zoom, targetZoom, 0.05));
      }
    }

    // Update Crown Position
    this.updateCrown();
  }

  private updateCrown() {
    let maxScore = -1;
    let leaderId: string | null = null;

    // Find leader
    Object.keys(this.players).forEach((id) => {
      const p = this.players[id];
      if (p.displayWidth > maxScore) {
        maxScore = p.displayWidth;
        leaderId = id;
      }
    });

    if (leaderId && this.players[leaderId]) {
      const leader = this.players[leaderId];
      this.crownText.setVisible(true);
      // Smooth follow
      this.crownText.x = Phaser.Math.Linear(this.crownText.x, leader.x, 0.2);
      this.crownText.y = Phaser.Math.Linear(
        this.crownText.y,
        leader.y - leader.displayHeight / 2 - 10,
        0.2,
      );
      this.crownText.setScale(leader.scale); // Scale crown with player
    } else {
      this.crownText.setVisible(false);
    }
  }

  private clones: Record<string, Phaser.GameObjects.Sprite[]> = {}; // Map playerID -> Array of 3 Sprites (or nulls)

  private cleanupClones(playerId: string) {
    if (this.clones[playerId]) {
      this.clones[playerId].forEach((sprite) => {
        if (sprite) {
          this.explosionEmitter.emitParticleAt(sprite.x, sprite.y, 5); // Poof
          sprite.destroy();
        }
      });
      delete this.clones[playerId];
    }
  }

  private updateNinjaClones(id: string, pData: any, parent: Phaser.GameObjects.Sprite) {
    if (!this.clones[id]) {
      this.clones[id] = [null as any, null as any, null as any];
    }

    const state = pData.ninjaState;
    const sprites = this.clones[id];

    // V-Formation Logic (Must match Server!)
    const spacing = pData.radius * 3;
    const pivotDist = pData.radius * 4;

    const getSlotPos = (slotI: number) => {
      let relAngle = 0;
      let relDist = 0;

      if (slotI === 0) {
        relAngle = -Math.PI * 0.75;
        relDist = pivotDist;
      } // Back Left
      if (slotI === 2) {
        relAngle = Math.PI * 0.75;
        relDist = pivotDist;
      } // Back Right
      if (slotI === 1) {
        relAngle = 0;
        relDist = 0;
      } // Center (Pivot) - unused for clones usually

      return { relAngle, relDist };
    };

    // Where is Pivot relative to Real Player?
    const realSlot = getSlotPos(state.formationIdx);
    const heading = pData.rotation; // Server rotation (radians)

    // Calculate Pivot Position (Virtual Anchor)
    // Pivot = P - rotated(realSlot)
    // Since P = Pivot + rotated(realSlot)
    const px = parent.x - Math.cos(heading + realSlot.relAngle) * realSlot.relDist;
    const py = parent.y - Math.sin(heading + realSlot.relAngle) * realSlot.relDist;

    [0, 1, 2].forEach((idx) => {
      // Skip Real Player (Visuals already handled by parent sprite)
      if (idx === state.formationIdx) {
        if (sprites[idx]) {
          sprites[idx].destroy();
          sprites[idx] = null as any;
        }
        return;
      }

      const isActive = state.activeClones[idx];

      // If inactive but sprite exists -> POOF
      if (!isActive) {
        if (sprites[idx]) {
          this.trailEmitter.emitParticleAt(sprites[idx].x, sprites[idx].y, 10); // Smoke poof
          sprites[idx].destroy();
          sprites[idx] = null as any;
        }
        return;
      }

      // If active, ensure sprite exists
      if (!sprites[idx]) {
        const skin = pData.skin || 'bmouse';
        const s = this.add.sprite(0, 0, `${skin}-front`);
        s.setAlpha(0.6); // Ghostly
        s.setTint(0x888888); // Darker shadow
        sprites[idx] = s;
      }

      const s = sprites[idx];

      // Calculate Position
      const cloneSlot = getSlotPos(idx);
      const cx = px + Math.cos(heading + cloneSlot.relAngle) * cloneSlot.relDist;
      const cy = py + Math.sin(heading + cloneSlot.relAngle) * cloneSlot.relDist;

      // Update Sprite
      s.x = cx;
      s.y = cy;
      s.setRotation(parent.rotation); // Face same way
      s.setScale(parent.scale); // Same size
      s.setDepth(15); // Behind real player (20), but above background (0)
    });
  }
}
