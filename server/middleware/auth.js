import jwt from 'jsonwebtoken';
import { getOne } from '../db.js';

export const JWT_SECRET = 'super-secret-clinical-crm-jwt-key-2026';

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Authentication token required.' }
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await getOne(
      `SELECT id, clinic_id, full_name, email, role, is_active FROM users WHERE id = ? AND is_active = 1;`,
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Invalid or inactive user session.' }
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Token expired or invalid.' }
    });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'UNAUTHORIZED',
          message: `Access denied. Role ${req.user.role} does not have permission for this action.`
        }
      });
    }

    next();
  };
}
