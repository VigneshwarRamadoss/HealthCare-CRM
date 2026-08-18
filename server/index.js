import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';

import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import providerRoutes from './routes/providers.js';
import appointmentRoutes from './routes/appointments.js';
import followupRoutes from './routes/followups.js';
import interactionRoutes from './routes/interactions.js';
import rescheduleRoutes from './routes/reschedule.js';
import overviewRoutes from './routes/overview.js';
import adminRoutes from './routes/admin.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/providers', providerRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/follow-ups', followupRoutes);
app.use('/api/v1', interactionRoutes);
app.use('/api/v1', rescheduleRoutes);
app.use('/api/v1/overview', overviewRoutes);
app.use('/api/v1/admin', adminRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected server error occurred.'
    }
  });
});

// Start Server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`ApexDental CRM API Server running at http://localhost:${PORT}/api/v1`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
