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
import pino from 'pino';
import client from 'prom-client';

// Observability Setup
const logger = pino({
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            ignore: 'pid,hostname',
        },
    },
});

// Prometheus Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// ... imports

const PORT = process.env.PORT || 8000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:3000";
const REDIS_URL = process.env.REDIS_URL;

// Environment Validation
if (!process.env.ALLOWED_ORIGIN) {
    logger.warn('[Env] ALLOWED_ORIGIN not set, defaulting to http://localhost:3000. Set this in production!');
}
if (!process.env.REDIS_URL) {
    logger.warn('[Env] REDIS_URL not set. Single-node mode only. Set this for scaling.');
}

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
        logger.info(`[Redis] Connecting to ${REDIS_URL}...`);
        try {
            const pubClient = createClient({ url: REDIS_URL });
            const subClient = pubClient.duplicate();

            await Promise.all([pubClient.connect(), subClient.connect()]);

            io.adapter(createAdapter(pubClient, subClient));
            logger.info('[Redis] Adapter attached successfully. Multi-node scaling enabled.');
        } catch (e) {
            logger.error(e, '[Redis] Connection failed:');
            // Fallback to memory adapter (default)
        }
    } else {
        logger.info('[Redis] No REDIS_URL found. Running in single-node mode.');
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

    // Metrics Endpoint
    app.get('/metrics', async (req, res) => {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    });

    const httpServer = server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    // Graceful Shutdown Logic
    const shutdown = (signal: string) => {
        logger.info(`[${signal}] Signal received: closing HTTP server...`);
        httpServer.close(() => {
            logger.info('HTTP server closed.');
            // Close Redis clients if accessible? 
            // Since they are inside local scope, we might leave them or move logic out.
            // But main goal is HTTP drain.
            // Force exit
            process.exit(0);
        });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (err) => {
        logger.fatal(err, 'Uncaught Exception');
        process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
        logger.error(reason, 'Unhandled Rejection');
    });
};

startServer();
