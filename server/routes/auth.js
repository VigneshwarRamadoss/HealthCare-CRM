import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getOne, run } from '../db.js';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email and password required.' } });
    }

    const user = await getOne(`SELECT * FROM users WHERE email = ? AND is_active = 1;`, [email.toLowerCase().trim()]);
    if (!user) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
    }

    const now = new Date().toISOString();
    await run(`UPDATE users SET last_login_at = ? WHERE id = ?;`, [now, user.id]);

    const token = jwt.sign({ userId: user.id, clinicId: user.clinic_id, role: user.role }, JWT_SECRET, { expiresIn: '12h' });

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          clinic_id: user.clinic_id,
          full_name: user.full_name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Login failed.' } });
  }
});

// Demo Login (quick persona switch)
router.post('/demo-login', async (req, res) => {
  try {
    const { role } = req.body;
    const targetRole = (role || 'NURSE').toUpperCase();
    
    const user = await getOne(`SELECT * FROM users WHERE role = ? AND is_active = 1 LIMIT 1;`, [targetRole]);
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: `No active user found for role ${targetRole}` } });
    }

    const token = jwt.sign({ userId: user.id, clinicId: user.clinic_id, role: user.role }, JWT_SECRET, { expiresIn: '12h' });

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          clinic_id: user.clinic_id,
          full_name: user.full_name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (err) {
    console.error('Demo login error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Demo login failed.' } });
  }
});

// Get Current User Profile
router.get('/me', authenticateToken, async (req, res) => {
  const clinic = await getOne(`SELECT id, name, timezone FROM clinics WHERE id = ?;`, [req.user.clinic_id]);
  res.json({
    data: {
      user: req.user,
      clinic
    }
  });
});

export default router;
