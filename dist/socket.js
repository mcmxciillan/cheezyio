"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocket = void 0;
const RoomManager_1 = require("./game/RoomManager");
const setupSocket = (io) => {
    const roomManager = new RoomManager_1.RoomManager(io);
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);
        // Version Handshake
        socket.emit('welcome', { version: '2.1' });
        socket.on('join', (data) => {
            // roomManager automatically finds/creates a room
            roomManager.joinRoom(socket, data.name || 'Anonymous');
        });
        socket.on('action', (data) => {
            roomManager.handlePlayerAction(socket.id, data);
        });
        socket.on('chat', (data) => {
            // Chat messages come as { message: "text" } from client
            if (data && data.message) {
                roomManager.handleChat(socket.id, data.message);
            }
        });
        socket.on('respawn', (data) => {
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
exports.setupSocket = setupSocket;
