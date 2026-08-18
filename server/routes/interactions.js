import express from 'express';
import crypto from 'crypto';
import { query, getOne, run } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Record Call Interaction Outcome
router.post('/appointments/:id/interactions', authenticateToken, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { outcome, note, retry_after, still_required } = req.body;

    const validOutcomes = [
      'CONFIRMED', 'NO_ANSWER', 'BUSY', 'DISCONNECTED', 
      'CALL_BACK_LATER', 'WANTS_RESCHEDULE', 'CANCELLED', 'WRONG_NUMBER', 'OTHER'
    ];

    if (!outcome || !validOutcomes.includes(outcome)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: `Outcome required. Must be one of: ${validOutcomes.join(', ')}` }
      });
    }

    if (outcome === 'OTHER' && (!note || !note.trim())) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'A note is required when recording "OTHER" call outcome.' }
      });
    }

    const apt = await getOne(
      `SELECT * FROM appointments WHERE id = ? AND clinic_id = ? AND voided_at IS NULL;`,
      [appointmentId, req.user.clinic_id]
    );

    if (!apt) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
    }

    const now = new Date().toISOString();
    const interactionId = crypto.randomUUID();

    // 1. Insert Interaction
    await run(
      `INSERT INTO interactions (id, clinic_id, patient_id, appointment_id, performed_by_user_id, type, outcome, note, occurred_at, created_at)
       VALUES (?, ?, ?, ?, ?, 'CALL', ?, ?, ?, ?);`,
      [interactionId, req.user.clinic_id, apt.patient_id, apt.id, req.user.id, outcome, note || null, now, now]
    );

    // 2. Apply Domain State Machine Updates
    let nextAppointmentStatus = apt.status;
    let nextTaskStatus = 'PENDING';
    let isTaskCompleted = false;

    if (outcome === 'CONFIRMED') {
      nextAppointmentStatus = 'CONFIRMED';
      nextTaskStatus = 'COMPLETED';
      isTaskCompleted = true;
    } else if (['NO_ANSWER', 'BUSY', 'DISCONNECTED', 'CALL_BACK_LATER'].includes(outcome)) {
      nextAppointmentStatus = 'SCHEDULED';
      nextTaskStatus = 'RETRY';
    } else if (outcome === 'WANTS_RESCHEDULE') {
      nextAppointmentStatus = 'SCHEDULED';
      nextTaskStatus = 'RESCHEDULE_REQUIRED';
    } else if (outcome === 'CANCELLED') {
      nextAppointmentStatus = 'CANCELLED';
      nextTaskStatus = 'CANCELLED';
      isTaskCompleted = true;
    } else if (outcome === 'WRONG_NUMBER') {
      nextAppointmentStatus = 'SCHEDULED';
      nextTaskStatus = 'BLOCKED';
      // Set patient phone status to INVALID
      await run(`UPDATE patients SET phone_status = 'INVALID', updated_at = ? WHERE id = ?;`, [now, apt.patient_id]);
    } else if (outcome === 'OTHER') {
      if (still_required === false) {
        nextTaskStatus = 'COMPLETED';
        isTaskCompleted = true;
      } else {
        nextTaskStatus = 'PENDING';
      }
    }

    // Update appointment latest_outcome and status
    const newRowVersion = apt.row_version + 1;
    await run(
      `UPDATE appointments SET status = ?, latest_outcome = ?, updated_by_user_id = ?, row_version = ?, updated_at = ? WHERE id = ?;`,
      [nextAppointmentStatus, outcome, req.user.id, newRowVersion, now, apt.id]
    );

    // Update active follow-up task
    if (isTaskCompleted) {
      await run(
        `UPDATE follow_up_tasks SET status = ?, completed_by_user_id = ?, completed_at = ?, source_interaction_id = ?, updated_at = ? WHERE appointment_id = ? AND completed_at IS NULL;`,
        [nextTaskStatus, req.user.id, now, interactionId, now, apt.id]
      );
    } else {
      await run(
        `UPDATE follow_up_tasks SET status = ?, retry_after = ?, source_interaction_id = ?, updated_at = ? WHERE appointment_id = ? AND completed_at IS NULL;`,
        [nextTaskStatus, retry_after || null, interactionId, now, apt.id]
      );
    }

    // Audit Event
    await run(
      `INSERT INTO audit_events (id, clinic_id, actor_user_id, entity_type, entity_id, action, after_json, occurred_at)
       VALUES (?, ?, ?, 'interaction', ?, 'RECORD_OUTCOME', ?, ?);`,
      [crypto.randomUUID(), req.user.clinic_id, req.user.id, interactionId, JSON.stringify({ outcome, appointment_id: apt.id, patient_id: apt.patient_id }), now]
    );

    const updatedApt = await getOne(
      `SELECT a.*, p.full_name as patient_name, pr.display_name as provider_name 
       FROM appointments a 
       JOIN patients p ON a.patient_id = p.id 
       JOIN providers pr ON a.provider_id = pr.id 
       WHERE a.id = ?;`,
      [apt.id]
    );

    res.status(201).json({
      data: {
        interaction_id: interactionId,
        outcome,
        appointment: updatedApt,
        task_status: nextTaskStatus
      }
    });
  } catch (err) {
    console.error('Record interaction error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to record call interaction.' } });
  }
});

// List interactions for appointment
router.get('/appointments/:id/interactions', authenticateToken, async (req, res) => {
  try {
    const interactions = await query(
      `SELECT i.*, u.full_name as performed_by_name 
       FROM interactions i 
       JOIN users u ON i.performed_by_user_id = u.id 
       WHERE i.appointment_id = ? AND i.clinic_id = ? 
       ORDER BY i.occurred_at DESC;`,
      [req.params.id, req.user.clinic_id]
    );
    res.json({ data: interactions });
  } catch (err) {
    console.error('Get interactions error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch interactions.' } });
  }
});

export default router;
