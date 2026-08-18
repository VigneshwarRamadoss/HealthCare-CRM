import express from 'express';
import crypto from 'crypto';
import { query, getOne, run } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// List providers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const providers = await query(
      `SELECT * FROM providers WHERE clinic_id = ? AND is_active = 1 ORDER BY display_name ASC;`,
      [req.user.clinic_id]
    );
    res.json({ data: providers });
  } catch (err) {
    console.error('Fetch providers error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch providers.' } });
  }
});

// Create provider
router.post('/', authenticateToken, requireRole('ADMIN', 'RECEPTIONIST'), async (req, res) => {
  try {
    const { display_name, specialty, user_id } = req.body;
    if (!display_name) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Provider display name is required.' } });
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await run(
      `INSERT INTO providers (id, clinic_id, display_name, specialty, user_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?);`,
      [id, req.user.clinic_id, display_name.trim(), specialty || null, user_id || null, now, now]
    );

    const provider = await getOne(`SELECT * FROM providers WHERE id = ?;`, [id]);
    res.status(201).json({ data: provider });
  } catch (err) {
    console.error('Create provider error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create provider.' } });
  }
});

export default router;
