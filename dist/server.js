"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const socket_1 = require("./socket");
const socket_io_msgpack_parser_1 = __importDefault(require("socket.io-msgpack-parser"));
dotenv_1.default.config();
const redis_1 = require("redis");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// ... imports
const PORT = process.env.PORT || 8000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:3000";
const REDIS_URL = process.env.REDIS_URL;
// Security: Rate Limiting
// Limit: 100 requests per 15 minutes window
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app_1.default.use('/health', limiter); // Protect health endpoint
// app.use(limiter); // Global limit? careful with game assets if served via express
const server = http_1.default.createServer(app_1.default);
const io = new socket_io_1.Server(server, {
    parser: socket_io_msgpack_parser_1.default,
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
            const pubClient = (0, redis_1.createClient)({ url: REDIS_URL });
            const subClient = pubClient.duplicate();
            await Promise.all([pubClient.connect(), subClient.connect()]);
            io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
            console.log('[Redis] Adapter attached successfully. Multi-node scaling enabled.');
        }
        catch (e) {
            console.error('[Redis] Connection failed:', e);
            // Fallback to memory adapter (default)
        }
    }
    else {
        console.log('[Redis] No REDIS_URL found. Running in single-node mode.');
    }
    // setup socket.io logic
    const roomManager = (0, socket_1.setupSocket)(io);
    // Observability Endpoint
    app_1.default.get('/health', (req, res) => {
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
