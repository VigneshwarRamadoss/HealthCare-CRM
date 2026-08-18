import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Pending Follow-Ups Queue
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    const { status, provider_id, timeframe } = req.query;
    let sql = `
      SELECT t.id as task_id, t.status as task_status, t.due_at, t.retry_after, t.created_at as task_created_at,
        a.id as appointment_id, a.scheduled_at, a.reason, a.notes as appointment_notes, a.status as appointment_status, a.latest_outcome, a.row_version,
        p.id as patient_id, p.full_name as patient_name, p.phone_e164 as patient_phone, p.phone_status as patient_phone_status, p.notes as patient_notes,
        pr.id as provider_id, pr.display_name as provider_name,
        (SELECT i.outcome FROM interactions i WHERE i.appointment_id = a.id ORDER BY i.occurred_at DESC LIMIT 1) as last_outcome,
        (SELECT i.occurred_at FROM interactions i WHERE i.appointment_id = a.id ORDER BY i.occurred_at DESC LIMIT 1) as last_call_at,
        (SELECT u.full_name FROM interactions i JOIN users u ON i.performed_by_user_id = u.id WHERE i.appointment_id = a.id ORDER BY i.occurred_at DESC LIMIT 1) as last_called_by
      FROM follow_up_tasks t
      JOIN appointments a ON t.appointment_id = a.id
      JOIN patients p ON t.patient_id = p.id
      JOIN providers pr ON a.provider_id = pr.id
      WHERE t.clinic_id = ? AND t.completed_at IS NULL AND a.voided_at IS NULL
    `;
    const params = [req.user.clinic_id];

    if (status) {
      sql += ` AND t.status = ?`;
      params.push(status);
    }

    if (provider_id) {
      sql += ` AND a.provider_id = ?`;
      params.push(provider_id);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (timeframe === 'today') {
      sql += ` AND date(a.scheduled_at) = date(?)`;
      params.push(todayStr);
    } else if (timeframe === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      sql += ` AND date(a.scheduled_at) = date(?)`;
      params.push(tomorrow.toISOString().split('T')[0]);
    } else if (timeframe === 'overdue') {
      sql += ` AND date(a.scheduled_at) < date(?) AND a.status != 'CONFIRMED'`;
      params.push(todayStr);
    }

    sql += ` ORDER BY a.scheduled_at ASC;`;
    const tasks = await query(sql, params);

    res.json({ data: tasks });
  } catch (err) {
    console.error('Fetch pending follow-ups error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch pending follow-ups.' } });
  }
});

// Completed Follow-Ups Queue
router.get('/completed', authenticateToken, async (req, res) => {
  try {
    const sql = `
      SELECT t.id as task_id, t.status as task_status, t.completed_at,
        a.id as appointment_id, a.scheduled_at, a.reason, a.status as appointment_status, a.latest_outcome,
        p.id as patient_id, p.full_name as patient_name, p.phone_e164 as patient_phone,
        pr.display_name as provider_name,
        u.full_name as completed_by_name
      FROM follow_up_tasks t
      JOIN appointments a ON t.appointment_id = a.id
      JOIN patients p ON t.patient_id = p.id
      JOIN providers pr ON a.provider_id = pr.id
      LEFT JOIN users u ON t.completed_by_user_id = u.id
      WHERE t.clinic_id = ? AND t.completed_at IS NOT NULL
      ORDER BY t.completed_at DESC LIMIT 50;
    `;
    const tasks = await query(sql, [req.user.clinic_id]);
    res.json({ data: tasks });
  } catch (err) {
    console.error('Fetch completed follow-ups error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch completed follow-ups.' } });
  }
});

export default router;
