// HR Analytics Platform — Express entry point
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { connect, getClient } from './src/db.js';
import { seedUsers } from './src/auth.js';
import { preload } from './src/services/dataService.js';

import authRouter from './src/routes/auth.js';
import dashboardRouter from './src/routes/dashboard.js';
import employeesRouter from './src/routes/employees.js';
import predictionsRouter from './src/routes/predictions.js';
import recommendationsRouter from './src/routes/recommendations.js';
import alertsRouter from './src/routes/alerts.js';
import uploadRouter from './src/routes/upload.js';

const app = express();
const PORT = process.env.PORT || 8000;

// ── CORS ─────────────────────────────────────────────────────────
app.use(cors({
    origin: '*',
}));

// ── Body parsing ──────────────────────────────────────────────────
app.use(express.json());

// ── Serverless Initialization Middleware ──────────────────────────
let isReady = false;
app.use(async (req, res, next) => {
    if (!isReady) {
        try {
            await connect();
            console.log('[OK] Connected to MongoDB');
            await seedUsers();
            await preload();
            console.log('[OK] Data preloaded');
            isReady = true;
        } catch (err) {
            console.error('[FAIL] Initialization error:', err);
            return res.status(500).json({ detail: 'Backend initialization failed' });
        }
    }
    next();
});

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/predictions', predictionsRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/upload', uploadRouter);

// ── Root ──────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ message: 'HR Analytics Platform API', db: 'MongoDB Atlas' });
});

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ detail: err.message || 'Internal server error' });
});

// ── Serverless Export ─────────────────────────────────────────────
export default app;
