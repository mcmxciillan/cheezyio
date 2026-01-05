import { Server, Socket } from 'socket.io';
import { RoomManager } from './game/RoomManager';

export const setupSocket = (io: Server) => {
  const roomManager = new RoomManager(io);

  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);
    
    // Version Handshake
    socket.emit('welcome', { version: '2.1' });

    socket.on('join', (data: any) => {
      // roomManager automatically finds/creates a room
      roomManager.joinRoom(socket, data.name || 'Anonymous');
    });

    socket.on('action', (data: any) => {
      roomManager.handlePlayerAction(socket.id, data);
    });
    
    socket.on('chat', (data: {message: string}) => {
         // Chat messages come as { message: "text" } from client
         if (data && data.message) {
             roomManager.handleChat(socket.id, data.message);
         }
    });

    socket.on('respawn', (data: { type: 'normal' | 'ad', name: string }) => {
        const name = data.name || 'Anonymous';
        roomManager.handleRespawn(socket.id, name, data.type);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      roomManager.removePlayer(socket.id);
    });
  });

  return roomManager;
};
