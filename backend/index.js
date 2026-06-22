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

// ── Startup ───────────────────────────────────────────────────────
async function start() {
    try {
        // Connect to MongoDB and seed users
        await connect();
        console.log('[OK] Connected to MongoDB Atlas');
        await seedUsers();
        console.log('[OK] Users seeded');

        // Preload CSV datasets into memory
        await preload();

        app.listen(PORT, () => {
            console.log(`[OK] HR Analytics API listening on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('[FAIL] Startup error:', err);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => { getClient()?.close(); process.exit(0); });
process.on('SIGTERM', () => { getClient()?.close(); process.exit(0); });

start();
