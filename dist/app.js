"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const node_path_1 = __importDefault(require("node:path"));
const app = (0, express_1.default)();
app.use((0, compression_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
}));
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            "img-src": ["'self'", "data:", "blob:"],
            "connect-src": ["'self'", "ws:", "wss:"], // Allow WebSocket
        }
    },
}));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve Static Frontend (Next.js Export)
// In production, files will be in ../client/out relative to dist/server.js
const staticPath = node_path_1.default.join(__dirname, '../client/out');
app.use(express_1.default.static(staticPath));
// Health check
app.get('/health-check', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
// SPA Fallback: Serve index.html for any unknown route
// Note: Express 5/path-to-regexp broke '*' wildcard. Using generic middleware instead.
app.use((req, res) => {
    res.sendFile(node_path_1.default.join(staticPath, 'index.html'));
});
exports.default = app;
