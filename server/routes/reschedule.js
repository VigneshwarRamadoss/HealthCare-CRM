import express from 'express';
import crypto from 'crypto';
import { getOne, run } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Atomic Reschedule Endpoint
router.post('/appointments/:id/reschedule', authenticateToken, async (req, res) => {
  try {
    const oldAptId = req.params.id;
    const { scheduled_at, provider_id, reason, note } = req.body;

    if (!scheduled_at) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'New scheduled date and time is required for rescheduling.' }
      });
    }

    const oldApt = await getOne(
      `SELECT * FROM appointments WHERE id = ? AND clinic_id = ? AND voided_at IS NULL;`,
      [oldAptId, req.user.clinic_id]
    );

    if (!oldApt) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Appointment to reschedule not found.' } });
    }

    if (oldApt.status === 'SUPERSEDED') {
      return res.status(409).json({
        error: { code: 'ALREADY_RESCHEDULED', message: 'This appointment has already been rescheduled.' }
      });
    }

    const now = new Date().toISOString();
    const newAptId = crypto.randomUUID();
    const newTaskId = crypto.randomUUID();
    const interactionId = crypto.randomUUID();

    // 1. Append Reschedule Interaction to preserve context
    await run(
      `INSERT INTO interactions (id, clinic_id, patient_id, appointment_id, performed_by_user_id, type, outcome, note, occurred_at, created_at)
       VALUES (?, ?, ?, ?, ?, 'CALL', 'WANTS_RESCHEDULE', ?, ?, ?);`,
      [interactionId, req.user.clinic_id, oldApt.patient_id, oldApt.id, req.user.id, note || 'Patient requested reschedule.', now, now]
    );

    // 2. Mark Old Appointment as SUPERSEDED and link to new appointment
    const oldRowVersion = oldApt.row_version + 1;
    await run(
      `UPDATE appointments SET 
        status = 'SUPERSEDED', 
        latest_outcome = 'WANTS_RESCHEDULE', 
        rescheduled_to_appointment_id = ?, 
        updated_by_user_id = ?, 
        row_version = ?, 
        updated_at = ? 
       WHERE id = ?;`,
      [newAptId, req.user.id, oldRowVersion, now, oldApt.id]
    );

    // 3. Complete Old Follow-Up Task
    await run(
      `UPDATE follow_up_tasks SET 
        status = 'COMPLETED', 
        completed_by_user_id = ?, 
        completed_at = ?, 
        source_interaction_id = ?, 
        updated_at = ? 
       WHERE appointment_id = ? AND completed_at IS NULL;`,
      [req.user.id, now, interactionId, now, oldApt.id]
    );

    // 4. Create New Active Replacement Appointment
    const newProviderId = provider_id || oldApt.provider_id;
    const newReason = reason ? reason.trim() : `${oldApt.reason} (Rescheduled)`;

    await run(
      `INSERT INTO appointments (
        id, clinic_id, patient_id, provider_id, scheduled_at, reason, notes, 
        status, latest_outcome, created_by_user_id, updated_by_user_id, rescheduled_from_appointment_id, row_version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', NULL, ?, ?, ?, 1, ?, ?);`,
      [newAptId, req.user.clinic_id, oldApt.patient_id, newProviderId, scheduled_at, newReason, oldApt.notes, req.user.id, req.user.id, oldApt.id, now, now]
    );

    // 5. Create New Active Follow-Up Task for New Appointment
    await run(
      `INSERT INTO follow_up_tasks (
        id, clinic_id, appointment_id, patient_id, status, due_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?);`,
      [newTaskId, req.user.clinic_id, newAptId, oldApt.patient_id, scheduled_at, now, now]
    );

    // 6. Write Audit Event
    await run(
      `INSERT INTO audit_events (id, clinic_id, actor_user_id, entity_type, entity_id, action, before_json, after_json, occurred_at)
       VALUES (?, ?, ?, 'appointment', ?, 'RESCHEDULE', ?, ?, ?);`,
      [
        crypto.randomUUID(), req.user.clinic_id, req.user.id, oldApt.id,
        JSON.stringify({ old_appointment_id: oldApt.id }), JSON.stringify({ new_appointment_id: newAptId, scheduled_at }), now
      ]
    );

    const newApt = await getOne(
      `SELECT a.*, p.full_name as patient_name, pr.display_name as provider_name 
       FROM appointments a 
       JOIN patients p ON a.patient_id = p.id 
       JOIN providers pr ON a.provider_id = pr.id 
       WHERE a.id = ?;`,
      [newAptId]
    );

    res.status(201).json({
      data: {
        superseded_appointment_id: oldApt.id,
        new_appointment: newApt
      }
    });
  } catch (err) {
    console.error('Atomic reschedule error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to reschedule appointment.' } });
  }
});

export default router;
