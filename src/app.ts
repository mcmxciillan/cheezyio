import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import path from 'node:path';

const app = express();

app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
}));
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "img-src": ["'self'", "data:", "blob:", "https://pagead2.googlesyndication.com"],
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://pagead2.googlesyndication.com", "https://tpc.googlesyndication.com"],
      "frame-src": ["'self'", "https://googleads.g.doubleclick.net", "https://pagead2.googlesyndication.com", "https://tpc.googlesyndication.com"],
      "connect-src": ["'self'", "ws:", "wss:", "https://pagead2.googlesyndication.com"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "upgrade-insecure-requests": [],
    }
  },
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Frontend (Next.js Export)
// In production, files will be in ../client/out relative to dist/server.js
const staticPath = path.join(__dirname, '../client/out');
app.use(express.static(staticPath, {
  maxAge: '1d', // Cache static assets for 1 day
  etag: true,
}));

// Health check
app.get('/health-check', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// SPA Fallback: Serve index.html for any unknown route
// Note: Express 5/path-to-regexp broke '*' wildcard. Using generic middleware instead.
app.use((req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Global Error]', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
});

export default app;
