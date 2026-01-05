import { Server, Socket } from 'socket.io';
import { GameManager } from './GameManager';

export class RoomManager {
  private io: Server;
  private rooms: Map<string, GameManager> = new Map();
  private socketToRoom: Map<string, string> = new Map();

  // Constants
  private readonly MAX_PLAYERS_PER_ROOM = 40;

  constructor(io: Server) {
    this.io = io;
    // Initialize first room
    this.createRoom();
  }

  private createRoom(): string {
      const roomId = `room-${Date.now()}`;
      const gameManager = new GameManager(this.io, roomId);
      this.rooms.set(roomId, gameManager);
      console.log(`[RoomManager] Created new room: ${roomId}`);
      return roomId;
  }

  public joinRoom(socket: Socket, playerName: string) {
      // Find a room with space
      let targetRoomId: string | null = null;
      
      for (const [id, game] of this.rooms) {
          if (game.getPlayerCount() < this.MAX_PLAYERS_PER_ROOM) {
              targetRoomId = id;
              break;
          }
      }

      // If no room found, create new one
      if (!targetRoomId) {
          targetRoomId = this.createRoom();
      }

      // Join Socket.IO room
      socket.join(targetRoomId);
      
      // Add to Game Logic
      const game = this.rooms.get(targetRoomId)!;
      game.addPlayer(socket.id, playerName);
      
      // Map socket to room
      this.socketToRoom.set(socket.id, targetRoomId);
      
      console.log(`[RoomManager] Player ${playerName} joined ${targetRoomId} (${game.getPlayerCount()}/${this.MAX_PLAYERS_PER_ROOM})`);
  }

  public handlePlayerAction(socketId: string, action: any) {
      const roomId = this.socketToRoom.get(socketId);
      if (roomId) {
          const game = this.rooms.get(roomId);
          if (game) {
              game.handlePlayerAction(socketId, action);
          }
      }
  }
  
  public handleChat(socketId: string, message: string) {
      const roomId = this.socketToRoom.get(socketId);
      if (roomId) {
          const game = this.rooms.get(roomId);
          if (game) {
              game.handleChat(socketId, message);
          }
      }
  }

  public handleRespawn(socketId: string, playerName: string, type: 'normal' | 'ad') {
      const roomId = this.socketToRoom.get(socketId);
      if (roomId) {
          const game = this.rooms.get(roomId);
          if (game) {
              game.requestRespawn(socketId, playerName, type);
          }
      } else {
          // If player isn't in a room (e.g. disconnected or cleaned up), map them to a new one?
          // Usually they should still be in socketToRoom if connected.
          // If not, treat as fresh join?
          // For now, assume they are connected.
      }
  }

  public removePlayer(socketId: string) {
      const roomId = this.socketToRoom.get(socketId);
      if (roomId) {
          const game = this.rooms.get(roomId);
          if (game) {
              game.removePlayer(socketId);
              console.log(`[RoomManager] Removed player from ${roomId}`);
              
              if (game.getPlayerCount() === 0 && this.rooms.size > 1) {
                   // Logic to shutdown room could go here
              }
          }
          this.socketToRoom.delete(socketId);
      }
  }

  public getStats() {
      let totalPlayers = 0;
      this.rooms.forEach(game => totalPlayers += game.getPlayerCount());
      
      return {
          rooms: this.rooms.size,
          players: totalPlayers,
          uptime: process.uptime()
      };
  }
}
