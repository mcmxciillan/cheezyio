import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameManager } from './GameManager';
import { Server } from 'socket.io';

describe('GameManager', () => {
    let ioMock: any;
    let gameManager: GameManager;

    beforeEach(() => {
        ioMock = {
            to: vi.fn().mockReturnThis(),
            emit: vi.fn(),
            sockets: {
                sockets: new Map()
            }
        };
        gameManager = new GameManager(ioMock as Server, 'test-room');
    });

    it('should add a player correctly', () => {
        const playerId = 'player-1';
        gameManager.addPlayer(playerId, 'TestUser');
        
        const player = gameManager.getPlayer(playerId);
        
        expect(player).toBeDefined();
        expect(player?.id).toBe(playerId);
        expect(player?.name).toBe('TestUser');
        expect(player?.score).toBe(0);
    });

    it('should sanitize invalid player names', () => {
        const playerId = 'player-bad';
        gameManager.addPlayer(playerId, '<script>alert("xss")</script>');
        
        const player = gameManager.getPlayer(playerId);
        
        expect(player?.name).not.toContain('<script>');
        expect(player?.name).toBe('scriptalertxsss'); // Truncated to 15 chars
    });
});
