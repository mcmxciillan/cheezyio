import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import path from 'path';

const app = express();

app.use(compression());
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false, // Prepare for static assets issues if strict
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Frontend (Next.js Export)
// In production, files will be in ../client/out relative to dist/server.js
const staticPath = path.join(__dirname, '../client/out');
app.use(express.static(staticPath));

// Health check
app.get('/health-check', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// SPA Fallback: Serve index.html for any unknown route
// Note: Express 5/path-to-regexp broke '*' wildcard. Using generic middleware instead.
app.use((req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

export default app;
