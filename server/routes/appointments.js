import express from 'express';
import crypto from 'crypto';
import { query, getOne, run } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// List Appointments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, provider_id, date } = req.query;
    let sql = `
      SELECT a.*, 
        p.full_name as patient_name, p.phone_e164 as patient_phone, p.phone_status as patient_phone_status,
        pr.display_name as provider_name,
        t.id as task_id, t.status as task_status
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN providers pr ON a.provider_id = pr.id
      LEFT JOIN follow_up_tasks t ON t.appointment_id = a.id AND t.completed_at IS NULL
      WHERE a.clinic_id = ? AND a.voided_at IS NULL
    `;
    const params = [req.user.clinic_id];

    if (status) {
      sql += ` AND a.status = ?`;
      params.push(status);
    }
    if (provider_id) {
      sql += ` AND a.provider_id = ?`;
      params.push(provider_id);
    }
    if (date) {
      sql += ` AND date(a.scheduled_at) = date(?)`;
      params.push(date);
    }

    sql += ` ORDER BY a.scheduled_at ASC;`;
    const appointments = await query(sql, params);

    res.json({ data: appointments });
  } catch (err) {
    console.error('Fetch appointments error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch appointments.' } });
  }
});

// Create Appointment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { patient_id, provider_id, scheduled_at, reason, notes } = req.body;

    if (!patient_id || !provider_id || !scheduled_at || !reason) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Patient, provider, date/time, and reason are required.' }
      });
    }

    // Verify patient belongs to clinic and is not voided
    const patient = await getOne(
      `SELECT id, phone_status FROM patients WHERE id = ? AND clinic_id = ? AND voided_at IS NULL;`,
      [patient_id, req.user.clinic_id]
    );

    if (!patient) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Patient not found or inactive.' } });
    }

    const now = new Date().toISOString();
    const aptId = crypto.randomUUID();
    const taskId = crypto.randomUUID();

    // Insert Appointment
    await run(
      `INSERT INTO appointments (
        id, clinic_id, patient_id, provider_id, scheduled_at, reason, notes, 
        status, latest_outcome, created_by_user_id, updated_by_user_id, row_version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', NULL, ?, ?, 1, ?, ?);`,
      [aptId, req.user.clinic_id, patient_id, provider_id, scheduled_at, reason.trim(), notes || null, req.user.id, req.user.id, now, now]
    );

    // Initial task status: if patient phone is INVALID -> BLOCKED, else PENDING
    const initialTaskStatus = patient.phone_status === 'INVALID' ? 'BLOCKED' : 'PENDING';

    await run(
      `INSERT INTO follow_up_tasks (
        id, clinic_id, appointment_id, patient_id, status, due_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [taskId, req.user.clinic_id, aptId, patient_id, initialTaskStatus, scheduled_at, now, now]
    );

    // Audit Event
    await run(
      `INSERT INTO audit_events (id, clinic_id, actor_user_id, entity_type, entity_id, action, after_json, occurred_at)
       VALUES (?, ?, ?, 'appointment', ?, 'CREATE', ?, ?);`,
      [crypto.randomUUID(), req.user.clinic_id, req.user.id, aptId, JSON.stringify({ patient_id, provider_id, scheduled_at, reason }), now]
    );

    const created = await getOne(
      `SELECT a.*, p.full_name as patient_name, pr.display_name as provider_name 
       FROM appointments a 
       JOIN patients p ON a.patient_id = p.id 
       JOIN providers pr ON a.provider_id = pr.id 
       WHERE a.id = ?;`,
      [aptId]
    );

    res.status(201).json({ data: created });
  } catch (err) {
    console.error('Create appointment error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create appointment.' } });
  }
});

// Single Appointment Details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const apt = await getOne(
      `SELECT a.*, 
        p.full_name as patient_name, p.phone_e164 as patient_phone, p.phone_status as patient_phone_status, p.notes as patient_notes,
        pr.display_name as provider_name,
        t.id as task_id, t.status as task_status, t.retry_after
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN providers pr ON a.provider_id = pr.id
       LEFT JOIN follow_up_tasks t ON t.appointment_id = a.id AND t.completed_at IS NULL
       WHERE a.id = ? AND a.clinic_id = ? AND a.voided_at IS NULL;`,
      [req.params.id, req.user.clinic_id]
    );

    if (!apt) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
    }

    const interactions = await query(
      `SELECT i.*, u.full_name as performed_by_name 
       FROM interactions i 
       JOIN users u ON i.performed_by_user_id = u.id 
       WHERE i.appointment_id = ? 
       ORDER BY i.occurred_at DESC;`,
      [apt.id]
    );

    res.json({ data: { ...apt, interactions } });
  } catch (err) {
    console.error('Get appointment error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch appointment.' } });
  }
});

// Update Appointment with Optimistic Locking
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { scheduled_at, reason, notes, provider_id, row_version } = req.body;
    const current = await getOne(
      `SELECT * FROM appointments WHERE id = ? AND clinic_id = ? AND voided_at IS NULL;`,
      [req.params.id, req.user.clinic_id]
    );

    if (!current) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
    }

    // Check optimistic concurrency version
    if (row_version !== undefined && row_version !== current.row_version) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'This appointment was already updated by another staff member. Please refresh to view the latest details.'
        }
      });
    }

    const now = new Date().toISOString();
    const newScheduledAt = scheduled_at || current.scheduled_at;
    const newReason = reason ? reason.trim() : current.reason;
    const newNotes = notes !== undefined ? notes : current.notes;
    const newProviderId = provider_id || current.provider_id;
    const newRowVersion = current.row_version + 1;

    await run(
      `UPDATE appointments SET scheduled_at = ?, reason = ?, notes = ?, provider_id = ?, updated_by_user_id = ?, row_version = ?, updated_at = ? WHERE id = ?;`,
      [newScheduledAt, newReason, newNotes, newProviderId, req.user.id, newRowVersion, now, current.id]
    );

    // Update active follow up task due date if scheduled_at changed
    if (scheduled_at && scheduled_at !== current.scheduled_at) {
      await run(
        `UPDATE follow_up_tasks SET due_at = ?, updated_at = ? WHERE appointment_id = ? AND completed_at IS NULL;`,
        [scheduled_at, now, current.id]
      );
    }

    // Audit Event
    await run(
      `INSERT INTO audit_events (id, clinic_id, actor_user_id, entity_type, entity_id, action, before_json, after_json, occurred_at)
       VALUES (?, ?, ?, 'appointment', ?, 'UPDATE', ?, ?, ?);`,
      [
        crypto.randomUUID(), req.user.clinic_id, req.user.id, current.id,
        JSON.stringify(current), JSON.stringify({ scheduled_at: newScheduledAt, reason: newReason, provider_id: newProviderId }), now
      ]
    );

    const updated = await getOne(`SELECT * FROM appointments WHERE id = ?;`, [current.id]);
    res.json({ data: updated });
  } catch (err) {
    console.error('Update appointment error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update appointment.' } });
  }
});

// Void (Logical Delete) Appointment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const apt = await getOne(
      `SELECT * FROM appointments WHERE id = ? AND clinic_id = ? AND voided_at IS NULL;`,
      [req.params.id, req.user.clinic_id]
    );

    if (!apt) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
    }

    // Check conditional delete RBAC policy: Nurse/Receptionist can only void if they created it AND no interactions exist
    const interactionCount = await getOne(`SELECT COUNT(*) as cnt FROM interactions WHERE appointment_id = ?;`, [apt.id]);
    if (req.user.role !== 'ADMIN') {
      if (apt.created_by_user_id !== req.user.id) {
        return res.status(403).json({
          error: { code: 'UNAUTHORIZED', message: 'Only the creator or an Administrator can void this appointment.' }
        });
      }
      if (interactionCount.cnt > 0) {
        return res.status(403).json({
          error: { code: 'UNAUTHORIZED', message: 'Cannot void an appointment that has logged call interactions. Admin intervention required.' }
        });
      }
    }

    const now = new Date().toISOString();
    await run(`UPDATE appointments SET status = 'VOIDED', voided_at = ?, updated_at = ? WHERE id = ?;`, [now, now, apt.id]);
    await run(`UPDATE follow_up_tasks SET status = 'CANCELLED', completed_at = ?, updated_at = ? WHERE appointment_id = ? AND completed_at IS NULL;`, [now, now, apt.id]);

    // Audit Event
    await run(
      `INSERT INTO audit_events (id, clinic_id, actor_user_id, entity_type, entity_id, action, before_json, occurred_at)
       VALUES (?, ?, ?, 'appointment', ?, 'VOID', ?, ?);`,
      [crypto.randomUUID(), req.user.clinic_id, req.user.id, apt.id, JSON.stringify(apt), now]
    );

    res.json({ data: { id: apt.id, status: 'VOIDED' } });
  } catch (err) {
    console.error('Void appointment error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to void appointment.' } });
  }
});

export default router;
