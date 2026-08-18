import express from 'express';
import crypto from 'crypto';
import { query, getOne, run } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// List / Search Patients
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT p.*, 
        (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id AND a.voided_at IS NULL) as total_appointments
      FROM patients p 
      WHERE p.clinic_id = ? AND p.voided_at IS NULL
    `;
    const params = [req.user.clinic_id];

    if (search) {
      sql += ` AND (p.full_name LIKE ? OR p.phone_e164 LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY p.created_at DESC LIMIT 50;`;
    const patients = await query(sql, params);

    res.json({ data: patients });
  } catch (err) {
    console.error('Fetch patients error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch patients.' } });
  }
});

// Create Patient
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { full_name, phone, notes } = req.body;

    if (!full_name || !phone) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Patient full name and phone number are required.' }
      });
    }

    // Normalize phone number (E164 simple cleanup)
    const phone_e164 = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim().replace(/\D/g, '')}`;

    // Check duplicate phone warning (not hard block)
    const existing = await getOne(
      `SELECT id, full_name FROM patients WHERE clinic_id = ? AND phone_e164 = ? AND voided_at IS NULL;`,
      [req.user.clinic_id, phone_e164]
    );

    const now = new Date().toISOString();
    const patientId = crypto.randomUUID();

    await run(
      `INSERT INTO patients (id, clinic_id, full_name, phone_e164, phone_status, notes, created_by_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'VALID', ?, ?, ?, ?);`,
      [patientId, req.user.clinic_id, full_name.trim(), phone_e164, notes || null, req.user.id, now, now]
    );

    // Audit Event
    await run(
      `INSERT INTO audit_events (id, clinic_id, actor_user_id, entity_type, entity_id, action, after_json, occurred_at)
       VALUES (?, ?, ?, 'patient', ?, 'CREATE', ?, ?);`,
      [crypto.randomUUID(), req.user.clinic_id, req.user.id, patientId, JSON.stringify({ full_name, phone_e164 }), now]
    );

    const newPatient = await getOne(`SELECT * FROM patients WHERE id = ?;`, [patientId]);

    res.status(201).json({
      data: newPatient,
      meta: { duplicate_warning: existing ? `Another patient (${existing.full_name}) shares this phone number.` : null }
    });
  } catch (err) {
    console.error('Create patient error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create patient.' } });
  }
});

// Get Single Patient Detail
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const patient = await getOne(
      `SELECT * FROM patients WHERE id = ? AND clinic_id = ? AND voided_at IS NULL;`,
      [req.params.id, req.user.clinic_id]
    );

    if (!patient) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Patient not found.' } });
    }

    const appointments = await query(
      `SELECT a.*, pr.display_name as provider_name 
       FROM appointments a 
       JOIN providers pr ON a.provider_id = pr.id 
       WHERE a.patient_id = ? AND a.voided_at IS NULL 
       ORDER BY a.scheduled_at DESC;`,
      [patient.id]
    );

    res.json({ data: { ...patient, appointments } });
  } catch (err) {
    console.error('Get patient error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch patient detail.' } });
  }
});

// Update Patient
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { full_name, phone_e164, phone_status, notes } = req.body;
    const patient = await getOne(
      `SELECT * FROM patients WHERE id = ? AND clinic_id = ? AND voided_at IS NULL;`,
      [req.params.id, req.user.clinic_id]
    );

    if (!patient) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Patient not found.' } });
    }

    const now = new Date().toISOString();
    const updatedName = full_name ? full_name.trim() : patient.full_name;
    const updatedPhone = phone_e164 ? phone_e164.trim() : patient.phone_e164;
    const updatedPhoneStatus = phone_status || patient.phone_status;
    const updatedNotes = notes !== undefined ? notes : patient.notes;

    await run(
      `UPDATE patients SET full_name = ?, phone_e164 = ?, phone_status = ?, notes = ?, updated_at = ? WHERE id = ?;`,
      [updatedName, updatedPhone, updatedPhoneStatus, updatedNotes, now, patient.id]
    );

    // If phone status unblocked from INVALID -> VALID, unblock any BLOCKED tasks
    if (patient.phone_status === 'INVALID' && updatedPhoneStatus === 'VALID') {
      await run(
        `UPDATE follow_up_tasks SET status = 'PENDING', updated_at = ? WHERE patient_id = ? AND status = 'BLOCKED';`,
        [now, patient.id]
      );
    }

    // Audit Event
    await run(
      `INSERT INTO audit_events (id, clinic_id, actor_user_id, entity_type, entity_id, action, before_json, after_json, occurred_at)
       VALUES (?, ?, ?, 'patient', ?, 'UPDATE', ?, ?, ?);`,
      [
        crypto.randomUUID(), req.user.clinic_id, req.user.id, patient.id,
        JSON.stringify(patient), JSON.stringify({ full_name: updatedName, phone_e164: updatedPhone, phone_status: updatedPhoneStatus }), now
      ]
    );

    const updated = await getOne(`SELECT * FROM patients WHERE id = ?;`, [patient.id]);
    res.json({ data: updated });
  } catch (err) {
    console.error('Update patient error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update patient.' } });
  }
});

// Patient Timeline (Chronological projection)
router.get('/:id/timeline', authenticateToken, async (req, res) => {
  try {
    const patientId = req.params.id;

    // Fetch appointments
    const appointments = await query(
      `SELECT a.id, a.scheduled_at, a.reason, a.status, a.created_at, pr.display_name as provider_name 
       FROM appointments a 
       JOIN providers pr ON a.provider_id = pr.id 
       WHERE a.patient_id = ? AND a.clinic_id = ?;`,
      [patientId, req.user.clinic_id]
    );

    // Fetch interactions
    const interactions = await query(
      `SELECT i.*, u.full_name as performed_by_name, a.reason as appointment_reason 
       FROM interactions i 
       JOIN users u ON i.performed_by_user_id = u.id 
       JOIN appointments a ON i.appointment_id = a.id 
       WHERE i.patient_id = ? AND i.clinic_id = ? 
       ORDER BY i.occurred_at DESC;`,
      [patientId, req.user.clinic_id]
    );

    // Merge & format timeline events
    const timeline = [];

    appointments.forEach(apt => {
      timeline.push({
        id: `apt-${apt.id}`,
        type: 'APPOINTMENT_SCHEDULED',
        timestamp: apt.created_at,
        title: `Appointment Scheduled: ${apt.reason}`,
        subtitle: `Provider: ${apt.provider_name} • Date: ${new Date(apt.scheduled_at).toLocaleString()}`,
        status: apt.status
      });
    });

    interactions.forEach(int => {
      timeline.push({
        id: `int-${int.id}`,
        type: 'CALL_INTERACTION',
        timestamp: int.occurred_at,
        title: `Call Outcome: ${int.outcome}`,
        subtitle: `Staff: ${int.performed_by_name} • Appointment: ${int.appointment_reason}`,
        note: int.note,
        outcome: int.outcome
      });
    });

    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ data: timeline });
  } catch (err) {
    console.error('Fetch timeline error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch timeline.' } });
  }
});

export default router;
