import { Server, Socket } from 'socket.io';

interface Player {
  id: string;
  x: number;
  y: number;
  score: number;
  name: string;
  vx: number; 
  vy: number; 
  radius: number;
  rotation: number;
  skin: 'bmouse' | 'gmouse' | 'wmouse';
  lastBoostTime: number;
  boosting: boolean;
  isBot: boolean;
  activeEffects?: Record<string, number>;
  ninjaState?: NinjaState;
}

interface Cheese {
  id: string;
  x: number;
  y: number;
  value: number;
  type: 'crumbs' | 'wedge' | 'block' | 'wheel';
}

const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;
const PLAYER_SPEED = 1.5;
const FRICTION = 0.9;
const MAX_SPEED = 10;
const INITIAL_RADIUS = 20;
const CHEESE_COUNT = 200;
const TARGET_PLAYERS = 40;

interface PowerUp {
  id: string;
  x: number;
  y: number;
  type: 'speed' | 'ghost' | 'magnet' | 'ninja';
}

interface NinjaState {
    formationIdx: number; // 0=Center, 1=Left, 2=Right
    activeClones: [boolean, boolean, boolean]; // [Left, Center, Right]
}

export class GameManager {
  private io: Server;
  public roomId: string; // Expose for manager
  private players: Record<string, Player> = {};
  private cheese: Record<string, Cheese> = {};
  private powerups: Record<string, PowerUp> = {}; 
  private deadPlayers: Record<string, { score: number, timestamp: number }> = {}; // Persist dead stats
  private loopInterval: NodeJS.Timeout | null = null;
  
  // Game Constants
  private readonly WORLD_SIZE = 2000;
  private readonly MAX_CHEESE = 100;
  private readonly MIN_PLAYER_RADIUS = 20;

  constructor(io: Server, roomId: string) {
    this.io = io;
    this.roomId = roomId;
    this.startGameLoop();
    this.spawnBots(15); 
    this.replenishCheese();
    this.replenishPowerUps();
  }

  private spawnBots(count: number) {
      for (let i = 0; i < count; i++) {
          this.addBot();
      }
  }

  private replenishCheese() {
      const currentCheese = Object.keys(this.cheese).length;
      if (currentCheese < this.MAX_CHEESE) {
          const needed = this.MAX_CHEESE - currentCheese;
          for (let i = 0; i < needed; i++) {
              // Spawn Cheese
               const id = Math.random().toString(36).substr(2, 9);
               const types = ['crumbs', 'wedge', 'block', 'wheel'] as const;
               // Weights: Crumbs(50%), Wedge(30%), Block(15%), Wheel(5%)
               const rand = Math.random();
               let type: Cheese['type'] = 'crumbs';
               let value = 1;
               
               if (rand > 0.95) { type = 'wheel'; value = 5; }
               else if (rand > 0.8) { type = 'block'; value = 3; }
               else if (rand > 0.5) { type = 'wedge'; value = 2; }
               
               this.cheese[id] = {
                   id,
                   x: Math.random() * WORLD_WIDTH,
                   y: Math.random() * WORLD_HEIGHT,
                   value,
                   type
               };
          }
      }
  }
  
  private replenishPowerUps() {
      const MAX_POWERUPS = 10;
      const current = Object.keys(this.powerups).length;
      
      if (current < MAX_POWERUPS && Math.random() < 0.05) { // Slow spawn chance per tick
           const id = Math.random().toString(36).substr(2, 9);
           const types = ['speed', 'ghost', 'magnet', 'ninja'] as const;
           const type = types[Math.floor(Math.random() * types.length)];
           
           this.powerups[id] = {
               id,
               x: Math.random() * WORLD_WIDTH,
               y: Math.random() * WORLD_HEIGHT,
               type
           };
      }
  }


  public addPlayer(id: string, name: string, startScore: number = 0) {
    const skins = ['bmouse', 'gmouse', 'wmouse'] as const;
    const skin = skins[Math.floor(Math.random() * skins.length)];

    this.players[id] = {
      id,
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      score: startScore,
      name: name.substring(0, 15) || `Guest-${id.substr(0,4)}`,
      boosting: false,
      isBot: false,
      rotation: 0,
      radius: INITIAL_RADIUS + Math.sqrt(startScore) * 4, // Calculate radius from score
      skin,
      lastBoostTime: 0,
      vx: 0,
      vy: 0,
      activeEffects: {}
    };
  }

  public removePlayer(id: string) {
    // If it was a bot, maybe respawn one immediately? 
    // Handled in managePopulation
    delete this.players[id];
  }

  public getPlayerCount(): number {
      return Object.keys(this.players).filter(id => !this.players[id].isBot).length;
      // Or total count including bots?
      // User asked for "100 players ... max 40 players". 
      // Usually refers to human limits. Let's count TOTAL for performance,
      // but maybe just humans for "room cap"? 
      // Let's stick to Object.keys(this.players).length to keep performance limits safe.
      return Object.keys(this.players).length;
  }

  public handlePlayerAction(id: string, action: { rotation: number, boost: boolean }) {
    const player = this.players[id];
    if (player && !player.isBot) {
      player.rotation = action.rotation;
      // Only allow boosting if score > 0
      player.boosting = action.boost && player.score > 0;
    }
  }

  // Handle Chat
  public handleChat(id: string, message: string) {
      const player = this.players[id];
      if (!player) return;

      // Rate limit / Spam protection could go here
      const cleanMessage = message.substring(0, 50); // Max 50 chars
      if (cleanMessage.trim().length > 0) {
          this.io.to(this.roomId).emit('chat', {
              id: Math.random().toString(36).substr(2, 9),
              sender: player.name,
              message: cleanMessage,
              timestamp: Date.now()
          });
      }
  }

  public startGameLoop() {
    if (this.loopInterval) return;
    
    const TPS = 20; // Ticks per second
    this.loopInterval = setInterval(() => {
      this.update(1 / TPS);
      // broadcastState is called inside update() now, so we don't need it here.
      // But wait, update() calls it at the end. 
      // The original code had update() then emit().
      // I moved emit() into update() (or rather, called broadcastState at end of update).
      // So this setInterval just triggers update().
    }, 1000 / TPS);
  }

  private addBot() {
      const id = 'bot-' + Math.random().toString(36).substr(2, 9);
      const skins = ['bmouse', 'gmouse', 'wmouse'] as const;
      const skin = skins[Math.floor(Math.random() * skins.length)];
      const names = ['Jerry', 'Mickey', 'Speedy', 'Stuart', 'Remy', 'Pinky', 'Brain', 'Fievel', 'Gadget', 'Itchy'];
      const name = names[Math.floor(Math.random() * names.length)];
      
      this.players[id] = {
          id,
          x: Math.random() * WORLD_WIDTH,
          y: Math.random() * WORLD_HEIGHT,
          score: 0,
          name: `[BOT] ${name}`,
          rotation: 0,
          radius: INITIAL_RADIUS,
          skin,
          boosting: false,
          isBot: true,
          lastBoostTime: 0,
          vx: 0,
          vy: 0,
          activeEffects: {}
      };
  }

  private updateBots() {
      Object.values(this.players).forEach(p => {
          if (!p.isBot) return;

          // Simple AI: 
          // 1. Find nearest cheese (seek)
          // 2. Find nearest bigger player (avoid)
          // 3. Find nearest smaller player (chase)
          
          let targetX = 0;
          let targetY = 0;
          let hasTarget = false;
          let avoidX = 0;
          let avoidY = 0;
          let avoidCount = 0;

          // Look for threats
          Object.values(this.players).forEach(other => {
              if (other.id === p.id) return;
              // Ghost Logic: Bot ignores ghosted players
              if (other.activeEffects?.ghost && other.activeEffects.ghost > Date.now()) return;

              const dx = other.x - p.x;
              const dy = other.y - p.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              
              if (dist < 300) {
                  if (other.radius > p.radius * 1.1) {
                      // Run away!
                      avoidX -= dx / dist;
                      avoidY -= dy / dist;
                      avoidCount++;
                  } else if (other.radius * 1.1 < p.radius) {
                      // Chase! (Counts as a target)
                      targetX = other.x;
                      targetY = other.y;
                      hasTarget = true;
                  }
              }
          });

          // Look for PowerUps (Higher priority than cheese)
          if (!hasTarget) {
              let minPowerUpDist = Infinity;
              Object.values(this.powerups).forEach(pu => {
                  const dx = pu.x - p.x;
                  const dy = pu.y - p.y;
                  const dist = Math.sqrt(dx*dx + dy*dy);
                  if (dist < minPowerUpDist && dist < 600) {
                      minPowerUpDist = dist;
                      targetX = pu.x;
                      targetY = pu.y;
                      hasTarget = true;
                  }
              });
          }

          // Look for Cheese if no player target
          if (!hasTarget) {
              let minDist = Infinity;
              Object.values(this.cheese).forEach(c => {
                 const dx = c.x - p.x;
                 const dy = c.y - p.y;
                 const dist = Math.sqrt(dx*dx + dy*dy);
                 if (dist < minDist && dist < 500) { // Limit vision
                     minDist = dist;
                     targetX = c.x;
                     targetY = c.y;
                     hasTarget = true;
                 }
              });
          }

          if (avoidCount > 0) {
              // Blend Seek and Avoid
              let seekWeight = 0.5;
              let avoidWeight = 2.0; 
              
              // Smart AI: If Ghosted, less afraid
              if (p.activeEffects?.ghost && p.activeEffects.ghost > Date.now()) {
                  avoidWeight = 0.5;
                  seekWeight = 1.5;
              }
              // If Speed, more aggressive
              if (p.activeEffects?.speed && p.activeEffects.speed > Date.now()) {
                  seekWeight = 1.5;
              }
              
              let normSeekX = 0;
              let normSeekY = 0;
              
              if (hasTarget) {
                  const dx = targetX - p.x;
                  const dy = targetY - p.y;
                  const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                  normSeekX = dx / dist;
                  normSeekY = dy / dist;
              }

              const finalDx = (normSeekX * seekWeight) + (avoidX * avoidWeight); 
              const finalDy = (normSeekY * seekWeight) + (avoidY * avoidWeight);
              
              const targetRotation = Math.atan2(finalDy, finalDx);
              
              // Smooth rotation
              let angleDiff = targetRotation - p.rotation;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              p.rotation += angleDiff * 0.1;
          } else if (hasTarget) {
              const dx = targetX - p.x;
              const dy = targetY - p.y;
              const targetRotation = Math.atan2(dy, dx);
              
              // Smooth rotation
              let angleDiff = targetRotation - p.rotation;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              p.rotation += angleDiff * 0.1;
          } else {
              // Wander
             p.rotation += (Math.random() - 0.5) * 0.2;
          }

          // Move (Apply acceleration to velocity)
          const acceleration = PLAYER_SPEED * Math.sqrt(INITIAL_RADIUS / p.radius);
          p.vx += Math.cos(p.rotation) * acceleration;
          p.vy += Math.sin(p.rotation) * acceleration;
      });
  }

  private managePopulation() {
      const currentCount = Object.keys(this.players).length;
      if (currentCount < TARGET_PLAYERS) {
          this.addBot();
      } else if (currentCount > TARGET_PLAYERS) {
          // Remove a bot if we have too many
          const botId = Object.keys(this.players).find(id => this.players[id].isBot);
          if (botId) {
              delete this.players[botId];
          }
      }
  }

  private update(dt: number) {
    // 0. Manage Population & AI
    this.managePopulation();
    this.updateBots();
    this.replenishCheese();
    this.replenishPowerUps(); // Check for spawns

    // 1. Physics Loop
    Object.values(this.players).forEach(player => {
      // Apply Friction
      player.vx *= FRICTION;
      player.vy *= FRICTION;

      // Apply Input Acceleration (for Human Players)
      // Bots already apply acceleration in updateBots, so skip them to avoid double speed
      // Apply Input Acceleration (for Human Players)
      // Bots already apply acceleration in updateBots, so skip them to avoid double speed
      if (!player.isBot) {
          // Force stop boosting if no mass
          if (player.score <= 0) {
              player.boosting = false;
          }

          let acceleration = PLAYER_SPEED * Math.sqrt(INITIAL_RADIUS / player.radius);
          
          if (player.boosting && player.score > 0) {
              acceleration *= 1.5; // Apply boost to acceleration too!
          }
          
          player.vx += Math.cos(player.rotation) * acceleration;
          player.vy += Math.sin(player.rotation) * acceleration;
      }

      // Cleanup Expired Effects
      if (player.activeEffects) {
          const now = Date.now();
          Object.keys(player.activeEffects).forEach(key => {
              if (player.activeEffects![key] < now) {
                  delete player.activeEffects![key];
              }
          });
      }


      // Cap Speed based on Size
      // Bigger = slower, but barely. Power 0.1 makes it very gentle.
      let maxSpeed = MAX_SPEED * Math.pow(INITIAL_RADIUS / player.radius, 0.1);
      
      // Boost increases cap slightly, BUT ONLY IF SCORE > 0
      if (player.boosting && player.score > 0) {
           maxSpeed *= 1.5; 
      }

      // Apply Speed PowerUp
      if (player.activeEffects?.speed && player.activeEffects.speed > Date.now()) {
          maxSpeed *= 2.0; // Double max speed
          player.vx *= 1.1; // Simple acceleration boost
          player.vy *= 1.1;
      }
      
      const speed = Math.sqrt(player.vx ** 2 + player.vy ** 2);
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        player.vx *= scale;
        player.vy *= scale;
      }

      // Apply Magnet Effect
      if (player.activeEffects?.magnet && player.activeEffects.magnet > Date.now()) {
          Object.values(this.cheese).forEach(c => {
              const dx = player.x - c.x;
              const dy = player.y - c.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              
              if (dist < 400) { // Increased pull range
                  const pullStrength = 12.0; // Stronger pull
                  c.x += (dx / dist) * pullStrength;
                  c.y += (dy / dist) * pullStrength;
              }
          });
      }

      // Handle Boosting Cost (Crumb Trail)
      if (player.boosting && player.score > 0) {
          const now = Date.now();
          if (now - player.lastBoostTime > 100) { // Costs 1 mass every 100ms
              player.score -= 1;
              player.radius = Math.min(200, INITIAL_RADIUS + Math.sqrt(player.score) * 4);
              player.lastBoostTime = now;
              
              // Spawn Crumb behind player
              // Position: Behind player based on rotation
              const angle = player.rotation + Math.PI; // 180 deg (behind)
              const dist = player.radius + 10;
              const cx = player.x + Math.cos(angle) * dist;
              const cy = player.y + Math.sin(angle) * dist;
              
              const id = Math.random().toString(36).substr(2, 9);
              this.cheese[id] = {
                  id,
                  x: Math.max(0, Math.min(WORLD_WIDTH, cx)), 
                  y: Math.max(0, Math.min(WORLD_HEIGHT, cy)),
                  value: 1,
                  type: 'crumbs'
              };
              
              this.io.to(player.id).emit('updateScore', player.score);
          }
      }

      // Update Position
      player.x += player.vx;
      player.y += player.vy;

      // World Boundaries
      player.x = Math.max(0, Math.min(WORLD_WIDTH, player.x));
      player.y = Math.max(0, Math.min(WORLD_HEIGHT, player.y));

      // 2. Collision with Cheese
      Object.values(this.cheese).forEach(c => {
        const dx = player.x - c.x;
        const dy = player.y - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < player.radius) {
          // Eat Cheese
          player.score += c.value;
          player.radius = Math.min(200, INITIAL_RADIUS + Math.sqrt(player.score) * 4); // Cap size
          delete this.cheese[c.id];
          
          // Notify client about score update (handled via state, but specific event is nice for UX)
          this.io.to(player.id).emit('updateScore', player.score);
        }
      });

      // 2.5 Collision with PowerUps
      Object.values(this.powerups).forEach(p => {
          const dx = player.x - p.x;
          const dy = player.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < player.radius) {
              // Collect PowerUp
              const now = Date.now();
              const duration = 10000; // 10 seconds (User Request)

              if (!player.activeEffects) player.activeEffects = {};

              // Apply Effect based on type
              if (p.type === 'speed') {
                  player.activeEffects.speed = now + duration;
              } else if (p.type === 'ghost') {
                  player.activeEffects.ghost = now + duration;
              } else if (p.type === 'magnet') {
                   player.activeEffects.magnet = now + duration;
              } else if (p.type === 'ninja') {
                   player.activeEffects.ninja = now + duration;
                   // Initialize Clones
                   // Randomly assign real player position: 0=Left, 1=Center, 2=Right
                   // Actually let's simplify: 0=Left (-45deg), 1=Center (0deg), 2=Right (+45deg) relative to heading
                   const formationIdx = Math.floor(Math.random() * 3);
                   player.ninjaState = {
                       formationIdx,
                       activeClones: [true, true, true]
                   };
              }
              
              delete this.powerups[p.id];
          }
      });
    });

    // 3. Player vs Player Collision (Eat smaller players)
    // Refactored to support Shadow Clones (Multiple Hitboxes)
    const sortedPlayers = Object.values(this.players).sort((a, b) => b.radius - a.radius);

    for (let i = 0; i < sortedPlayers.length; i++) {
        let gotoNextPair = false;
        for (let j = i + 1; j < sortedPlayers.length; j++) {
            const p1 = sortedPlayers[i];
            const p2 = sortedPlayers[j];

            // Ignore if either turned invalid (e.g. eaten in same tick)
            if (!this.players[p1.id] || !this.players[p2.id]) continue;

            const hitboxes1 = this.getPlayerHitboxes(p1);
            const hitboxes2 = this.getPlayerHitboxes(p2);

            for (const h1 of hitboxes1) {
                for (const h2 of hitboxes2) {
                     // Check if target is already invalid (e.g. clone popped)
                     if (h1.isClone && !p1.ninjaState?.activeClones[h1.index!]) continue;
                     if (h2.isClone && !p2.ninjaState?.activeClones[h2.index!]) continue;
                     
                     // Optimization: Radius check
                     if (h1.radius <= h2.radius * 1.1) continue; // h1 must be bigger to eat h2

                     const dx = h1.x - h2.x;
                     const dy = h1.y - h2.y;
                     const dist = Math.sqrt(dx*dx + dy*dy);

                     if (dist < h1.radius) {
                         // Collision! H1 eats H2
                         
                         // Case A: H2 is a CLONE
                         if (h2.isClone) {
                             // Pop the clone!
                             if (p2.ninjaState) {
                                 p2.ninjaState.activeClones[h2.index!] = false;
                                 // Juice: Emit 'poof' event? Or state change handles it?
                                 // Let's rely on state change. Client will see clone disappear.
                             }
                             // No score gain, no death. Just decoy destroyed.
                             continue; 
                         }

                         // Case B: H2 is REAL
                         if (!h2.isClone) {
                             // Do I eat them? 
                             // Only if I am REAL. A Clone cannot eat a real player (it's just a shadow).
                             if (h1.isClone) {
                                  // Clone touched real player. 
                                  // If Clone is bigger, it should just pass through or maybe pop?
                                  // User says: "if the user [Real] is larger than the colliding player and a shadow clone collides with them, they also should not die and the shadow clone should disappear"
                                  // So if Real(Small) touches Clone(Big), nothing happens?
                                  // Wait, h1.radius > h2.radius * 1.1 check passed.
                                  // So H1 (Clone) is BIG, H2 (Real) is SMALL.
                                  // Clone should NOT eat Real.
                                  // Should Clone pop? "shadow clone collides... shadow clone should disappear"
                                  if (p1.ninjaState) {
                                     p1.ninjaState.activeClones[h1.index!] = false;
                                  }
                                  continue;
                             }

                             // Both REAL. H1(Real) eats H2(Real).
                             this.handleEatPlayer(p1, p2);
                             // Break inner loops since P2 is dead
                             gotoNextPair = true;
                         }
                     }
                }
                if (gotoNextPair) break;
            }
            if (gotoNextPair) {
                 gotoNextPair = false; // Reset for next i,j
                 continue; 
            }
        }
    }

    // Broadcast state to clients
    this.broadcastState();
  }
  
  private handleEatPlayer(p1: Player, p2: Player) {
       // P1 eats P2
        // EXPLOSION LOGIC:
        // 1. Drop P2's mass as cheese
        this.spawnCheeseExplosion(p2.x, p2.y, p2.score);
        
        // 2. Small finder's fee for P1
        p1.score += 10; 
        p1.radius = Math.min(200, INITIAL_RADIUS + Math.sqrt(p1.score) * 4);
        
        this.io.to(p1.id).emit('updateScore', p1.score);
        
        // Kill Feed Event
        this.io.to(this.roomId).emit('playerKilled', { 
            killer: p1.name, 
            victim: p2.name 
        });

        // 3. Handle Death (No Auto-Respawn)
        // Store stats if worth saving (User Request: "if they are over 100 score")
        if (p2.score > 100 && !p2.isBot) {
            this.deadPlayers[p2.id] = {
                score: p2.score,
                timestamp: Date.now()
            };
        }

        // Notify Victim
        this.io.to(p2.id).emit('gameOver', {
            finalScore: p2.score,
            killer: p1.name,
            canRevive: p2.score > 100
        });

        // Remove from active players
        delete this.players[p2.id];
  }

  private getPlayerHitboxes(p: Player) {
      // 1. Real Player
      const res = [{ x: p.x, y: p.y, radius: p.radius, isClone: false, index: -1 }];
      
      // 2. Ninja Clones
      if (p.activeEffects?.ninja && p.activeEffects.ninja > Date.now() && p.ninjaState) {
          // Calculate Clone Positions
          // V Formation: 
          // Center is Real? Or Random?
          // ninjaState.formationIdx tells us where REAL player is.
          // 0=Left, 1=Center, 2=Right.
          // Offsets relative to Rotation.
          // Distance: Let's say 3 * Radius behind/side.
          
          const offsets = [-1, 0, 1]; // Left, Center, Right relative positions
          // actually, V formation is usually:
          //       Head
          //    L1      R1
          
          // Let's implement a simple line or wedge.
          // Let's use relative angles: -45, 0, +45 degrees.
          // Distance: 3 * radius.
          
          const spacing = p.radius * 3;
          
          [0, 1, 2].forEach(idx => {
              if (idx === p.ninjaState!.formationIdx) return; // Skip Real Player Position (already added)
              if (!p.ninjaState!.activeClones[idx]) return; // Skip popped clones
              
              // Calculate relative offset based on index (0=Left, 1=Center, 2=Right)
              // Center is at (0,0) relative. Left is (-1, -1), Right is (1, -1) for V?
              // User said "V formation".
              // Let's put Center at front, Left/Right behind? 
              // Or Center in middle line?
              // "user will be at a random spot ... (middle, left, right)"
              
              let angleOffset = 0;
              let distOffset = 0;
              
              if (idx === 0) { angleOffset = -Math.PI / 4; distOffset = spacing; } // Left Back
              if (idx === 1) { angleOffset = 0; distOffset = 0; } // Center Front
              if (idx === 2) { angleOffset = Math.PI / 4; distOffset = spacing; } // Right Back
              
              // But if Center corresponds to idx=1...
              // Real player is at idx.
              // We need to shift everything so the whole formation moves with P.
              // Actually, P.x/y is the position of the REAL BODY.
              // So the formation is RELATIVE TO P.
              // If P is "Right", then Center is Left-Front of P. Left is Left-Left of P?
              // This is confusing. 
              // Simpler: The formation has 3 slots. One slot is occupied by P (Real). The other 2 are Clones.
              // We define the slots relative to a virtual "Center of Formation".
              // But P controls the movement.
              
              // Approach B: 
              // P is always the anchor.
              // If P is Center (1): Left Clone is (-45deg, dist), Right Clone is (+45deg, dist).
              // If P is Left (0): Center Clone is (+45deg, dist), Right Clone is (+90deg?? no).
              // Let's define the 3 absolute formation slots relative to a Pivot.
              // Slot 0 (Left): -45deg, dist from Pivot.
              // Slot 1 (Center): Pivot.
              // Slot 2 (Right): +45deg, dist from Pivot.
              
              // If P is Slot 0: Pivot is at P's position? No, P is at Slot 0.
              // So Pivot = P - offset(0).
              // Then Slot 1 = Pivot.
              // Slot 2 = Pivot + offset(2).
              
              // Let's compute Pivot (Virtual Center).
              // Angle of P relative to Pivot?
              // If P is Left (0), it is at Pivot + (-45deg, dist).
              // So Pivot = P - (-45deg, dist).
              
              // Offsets from Pivot (aligned with Rotation)
              const pivotDist = p.radius * 4;
              
              const getSlotPos = (slotI: number) => {
                  // Angle relative to Heading (p.rotation)
                  let relAngle = 0;
                  let relDist = 0;
                  
                  if (slotI === 0) { relAngle = -Math.PI / 3; relDist = pivotDist; } // Left
                  if (slotI === 2) { relAngle = Math.PI / 3; relDist = pivotDist; } // Right
                  if (slotI === 1) { relAngle = 0; relDist = 0; } // Center (Pivot)
                  
                  // But wait, V formation means Center is usually FORWARD.
                  // Let's make Center the tip of the spear.
                  // Left/Right are behind.
                  
                  if (slotI === 0) { relAngle = -Math.PI * 0.75; relDist = pivotDist; } // Back Left
                  if (slotI === 2) { relAngle = Math.PI * 0.75; relDist = pivotDist; } // Back Right
                  
                  return { relAngle, relDist };
              };
              
              // Where is Pivot relative to Real Player?
              const realSlot = getSlotPos(p.ninjaState!.formationIdx);
              // P = Pivot + rotated(realSlot)
              // Pivot = P - rotated(realSlot)
              
              const heading = p.rotation;
              const px = p.x - Math.cos(heading + realSlot.relAngle) * realSlot.relDist;
              const py = p.y - Math.sin(heading + realSlot.relAngle) * realSlot.relDist;
              
              // Now calc Clone pos
              const cloneSlot = getSlotPos(idx);
              const cx = px + Math.cos(heading + cloneSlot.relAngle) * cloneSlot.relDist;
              const cy = py + Math.sin(heading + cloneSlot.relAngle) * cloneSlot.relDist;
              
              res.push({ x: cx, y: cy, radius: p.radius, isClone: true, index: idx });
          });
      }
      return res;
  }


  // --- Respawn Logic ---
  public requestRespawn(id: string, name: string, type: 'normal' | 'ad') {
      // 1. Check if valid dead player (for Ad revive)
      let startScore = 0;
      
      if (type === 'ad') {
          const deadData = this.deadPlayers[id];
          if (deadData && (Date.now() - deadData.timestamp < 60000)) { // 60s Clean up
             startScore = Math.floor(deadData.score * 0.5);
          }
           delete this.deadPlayers[id]; // Consume the chance
      }

      // 2. Clear old dead entry if normal spawn
      if (type === 'normal') {
          delete this.deadPlayers[id];
      }

      // 3. Add Player Back
      this.addPlayer(id, name, startScore);
  }

  private broadcastState() {
      const now = Date.now();
      const publicPlayers: Record<string, Player> = {};
      const ghostIds: string[] = [];

      // 1. Separate Ghosts from Public
      Object.values(this.players).forEach(p => {
          if (p.activeEffects?.ghost && p.activeEffects.ghost > now) {
              ghostIds.push(p.id);
          } else {
              publicPlayers[p.id] = p;
          }
      });

      // 2. Optimization: If no ghosts, broadcast global state (Fast Path)
      if (ghostIds.length === 0) {
           this.io.to(this.roomId).emit('state', { 
              players: this.players,
              cheese: this.cheese,
              powerups: this.powerups
          });
          return;
      }

      // 3. Slow Path: Per-player custom view
      Object.values(this.players).forEach(p => {
          let viewPlayers = publicPlayers;

          // If I am a ghost, I need to see myself
          if (ghostIds.includes(p.id)) {
              viewPlayers = { ...publicPlayers, [p.id]: p };
          }

          // Note: Creating a new object per player is O(N), total O(N^2)
          // With N=40, this is ~1600 props, perfectly fine.
          
          this.io.to(p.id).emit('state', {
              players: viewPlayers,
              cheese: this.cheese,
              powerups: this.powerups
          });
      });
  }

  private spawnCheeseExplosion(x: number, y: number, totalValue: number) {
      let remaining = totalValue;
      const maxItems = 40; // Prevent server lag from massive drops
      let count = 0;

      // Greedy breakdown: Wheel(5) -> Block(3) -> Wedge(2) -> Crumb(1)
      while (remaining > 0 && count < maxItems) {
          let type: Cheese['type'] = 'crumbs';
          let value = 1;

          if (remaining >= 5) { type = 'wheel'; value = 5; }
          else if (remaining >= 3) { type = 'block'; value = 3; }
          else if (remaining >= 2) { type = 'wedge'; value = 2; }
          
          remaining -= value;

          // Spawn it nearby
          const id = Math.random().toString(36).substr(2, 9);
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * 400; // Scatter within 400px radius (User Request: Wider spread)

          this.cheese[id] = {
              id,
              x: Math.max(0, Math.min(WORLD_WIDTH, x + Math.cos(angle) * dist)),
              y: Math.max(0, Math.min(WORLD_HEIGHT, y + Math.sin(angle) * dist)),
              value,
              type
          };
          count++;
      }
  }
}
