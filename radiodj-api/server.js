import './config/env.js';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { authenticate } from './middleware/auth.js';
import { generalLimiter } from './middleware/rateLimit.js';
import routes from './routes/index.js';

const app = express();

// Sécurité
app.use(helmet());
app.use(cors({ origin: env.allowedOrigins }));
app.use(express.json());

// Rate limiting général
app.use(generalLimiter);

// Auth sur toutes les routes /api
app.use('/api', authenticate);

// Routes
app.use('/api', routes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Erreurs non catchées
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Démarrage
async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('[DB] Connected');

    app.listen(env.port, () => {
      console.log(`[API] Running on port ${env.port} (${env.isDev ? 'dev' : 'production'})`);
      console.log(`[API] Cooldown requests: ${env.requestCooldownHours}h`);
    });
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  }
}

start();
