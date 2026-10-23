import express from 'express';
import http from 'http';
import path from 'path';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRouter from './src/server/routes/auth.ts';
import machinesRouter from './src/server/routes/machines.ts';
import walletRouter from './src/server/routes/wallet.ts';
import paymentsRouter from './src/server/routes/payments.ts';
import ticketsRouter from './src/server/routes/tickets.ts';
import notificationsRouter from './src/server/routes/notifications.ts';
import settingsRouter from './src/server/routes/settings.ts';
import adminRouter from './src/server/routes/admin.ts';

dotenv.config();

const app = express();
const server = http.createServer(app);

// In this environment, port 8080 is reserved for nginx which proxies to port 3000.
// The Node.js application must always bind to port 3000.
const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS & Security Headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Mount API routers
app.use('/api/auth', authRouter);
app.use('/api/machines', machinesRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    platform: 'AQUA MACHINES',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'The requested API endpoint does not exist.' });
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'A platform server error occurred. Please try again shortly.' });
});

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: { usePolling: true },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`💧 AQUA MACHINES backend & frontend server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
