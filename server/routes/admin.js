import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, getOne, run } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// List Users (Admin only)
router.get('/users', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const users = await query(
      `SELECT id, clinic_id, full_name, email, role, is_active, last_login_at, created_at 
       FROM users WHERE clinic_id = ? ORDER BY created_at DESC;`,
      [req.user.clinic_id]
    );
    res.json({ data: users });
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch users.' } });
  }
});

// Create User (Admin only)
router.post('/users', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;
    const validRoles = ['NURSE', 'RECEPTIONIST', 'DOCTOR', 'ADMIN'];

    if (!full_name || !email || !password || !role || !validRoles.includes(role)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Full name, valid email, password, and role are required.' }
      });
    }

    const existing = await getOne(`SELECT id FROM users WHERE email = ?;`, [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(409).json({
        error: { code: 'EMAIL_IN_USE', message: 'A user with this email address already exists.' }
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    const userId = crypto.randomUUID();

    await run(
      `INSERT INTO users (id, clinic_id, full_name, email, password_hash, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?);`,
      [userId, req.user.clinic_id, full_name.trim(), email.toLowerCase().trim(), passwordHash, role, now, now]
    );

    // Audit Event
    await run(
      `INSERT INTO audit_events (id, clinic_id, actor_user_id, entity_type, entity_id, action, after_json, occurred_at)
       VALUES (?, ?, ?, 'user', ?, 'CREATE_USER', ?, ?);`,
      [crypto.randomUUID(), req.user.clinic_id, req.user.id, userId, JSON.stringify({ full_name, email, role }), now]
    );

    const created = await getOne(
      `SELECT id, clinic_id, full_name, email, role, is_active, created_at FROM users WHERE id = ?;`,
      [userId]
    );
    res.status(201).json({ data: created });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create user.' } });
  }
});

// Update User (Admin only)
router.patch('/users/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { role, is_active } = req.body;
    const user = await getOne(`SELECT * FROM users WHERE id = ? AND clinic_id = ?;`, [req.params.id, req.user.clinic_id]);

    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });
    }

    const now = new Date().toISOString();
    const updatedRole = role || user.role;
    const updatedActive = is_active !== undefined ? (is_active ? 1 : 0) : user.is_active;

    await run(`UPDATE users SET role = ?, is_active = ?, updated_at = ? WHERE id = ?;`, [updatedRole, updatedActive, now, user.id]);

    // Audit Event
    await run(
      `INSERT INTO audit_events (id, clinic_id, actor_user_id, entity_type, entity_id, action, before_json, after_json, occurred_at)
       VALUES (?, ?, ?, 'user', ?, 'UPDATE_USER', ?, ?, ?);`,
      [
        crypto.randomUUID(), req.user.clinic_id, req.user.id, user.id,
        JSON.stringify({ role: user.role, is_active: user.is_active }),
        JSON.stringify({ role: updatedRole, is_active: updatedActive }), now
      ]
    );

    const updated = await getOne(`SELECT id, clinic_id, full_name, email, role, is_active, updated_at FROM users WHERE id = ?;`, [user.id]);
    res.json({ data: updated });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update user.' } });
  }
});

// Audit Logs (Admin only)
router.get('/audit-logs', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const logs = await query(
      `SELECT a.*, u.full_name as actor_name, u.role as actor_role 
       FROM audit_events a 
       JOIN users u ON a.actor_user_id = u.id 
       WHERE a.clinic_id = ? 
       ORDER BY a.occurred_at DESC LIMIT 100;`,
      [req.user.clinic_id]
    );
    res.json({ data: logs });
  } catch (err) {
    console.error('Fetch audit logs error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch audit logs.' } });
  }
});

export default router;
