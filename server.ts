import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { apiRouter } from './server/routes/apiRouter';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS & Security Headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// API Routes
app.use('/api', apiRouter);

// Global Error Handler for API
app.use('/api', (err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[RAILSYNC Server Error]:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err?.message || 'Unexpected server error occurred',
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  if (!isProduction) {
    // In development: mount Vite middlewares for hot module reloading and Vite SPA serving
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[RAILSYNC Full-Stack] Vite development middlewares mounted.');
  } else {
    // In production: serve static build assets from dist
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[RAILSYNC Full-Stack] Production static assets serving enabled.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚂 RAILSYNC High-Performance Server running on http://0.0.0.0:${PORT}`);
    console.log(`⚡ Mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`🤖 Gemini AI Engine: ${process.env.GEMINI_API_KEY ? 'CONFIGURED' : 'HEURISTIC FALLBACK'}`);
    console.log(`📡 API Endpoints active at http://0.0.0.0:${PORT}/api/`);
    console.log(`=======================================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting RAILSYNC server:', err);
  process.exit(1);
});
