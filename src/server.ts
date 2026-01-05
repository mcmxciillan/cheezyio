import http from 'http';
import app from './app';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { setupSocket } from './socket';
import parser from 'socket.io-msgpack-parser';

dotenv.config();

import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import rateLimit from 'express-rate-limit';

// ... imports

const PORT = process.env.PORT || 8000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:3000";
const REDIS_URL = process.env.REDIS_URL;

// Security: Rate Limiting
// Limit: 100 requests per 15 minutes window
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, 
	max: 100, 
	standardHeaders: true, 
	legacyHeaders: false, 
});
app.use('/health', limiter); // Protect health endpoint
// app.use(limiter); // Global limit? careful with game assets if served via express

const server = http.createServer(app);
const io = new Server(server, {
  parser,
  cors: {
    origin: ALLOWED_ORIGIN, 
    methods: ["GET", "POST"]
  }
});

// Setup Redis Adapter for Scalability
const startServer = async () => {
    if (REDIS_URL) {
        console.log(`[Redis] Connecting to ${REDIS_URL}...`);
        try {
            const pubClient = createClient({ url: REDIS_URL });
            const subClient = pubClient.duplicate();

            await Promise.all([pubClient.connect(), subClient.connect()]);

            io.adapter(createAdapter(pubClient, subClient));
            console.log('[Redis] Adapter attached successfully. Multi-node scaling enabled.');
        } catch (e) {
            console.error('[Redis] Connection failed:', e);
            // Fallback to memory adapter (default)
        }
    } else {
        console.log('[Redis] No REDIS_URL found. Running in single-node mode.');
    }

    // setup socket.io logic
    const roomManager = setupSocket(io);

    // Observability Endpoint
    app.get('/health', (req, res) => {
        const stats = roomManager.getStats();
        res.json({
            status: 'ok',
            version: process.env.npm_package_version || '2.0.0',
            redis: !!REDIS_URL,
            ...stats
        });
    });

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
};

startServer();
