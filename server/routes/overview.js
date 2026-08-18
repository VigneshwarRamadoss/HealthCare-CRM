import express from 'express';
import { query, getOne } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Operational Overview Dashboard
router.get('/', authenticateToken, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const todayCount = await getOne(
      `SELECT COUNT(*) as cnt FROM appointments WHERE clinic_id = ? AND voided_at IS NULL AND date(scheduled_at) = date(?);`,
      [req.user.clinic_id, todayStr]
    );

    const tomorrowCount = await getOne(
      `SELECT COUNT(*) as cnt FROM appointments WHERE clinic_id = ? AND voided_at IS NULL AND date(scheduled_at) = date(?);`,
      [req.user.clinic_id, tomorrowStr]
    );

    const confirmedCount = await getOne(
      `SELECT COUNT(*) as cnt FROM appointments WHERE clinic_id = ? AND voided_at IS NULL AND status = 'CONFIRMED';`,
      [req.user.clinic_id]
    );

    const retryCount = await getOne(
      `SELECT COUNT(*) as cnt FROM follow_up_tasks WHERE clinic_id = ? AND status = 'RETRY' AND completed_at IS NULL;`,
      [req.user.clinic_id]
    );

    const rescheduleRequiredCount = await getOne(
      `SELECT COUNT(*) as cnt FROM follow_up_tasks WHERE clinic_id = ? AND status = 'RESCHEDULE_REQUIRED' AND completed_at IS NULL;`,
      [req.user.clinic_id]
    );

    const notContactedCount = await getOne(
      `SELECT COUNT(*) as cnt FROM appointments WHERE clinic_id = ? AND voided_at IS NULL AND latest_outcome IS NULL AND status = 'SCHEDULED';`,
      [req.user.clinic_id]
    );

    const pendingTotalCount = await getOne(
      `SELECT COUNT(*) as cnt FROM follow_up_tasks WHERE clinic_id = ? AND completed_at IS NULL;`,
      [req.user.clinic_id]
    );

    const needsAttentionList = await query(
      `SELECT t.id as task_id, t.status as task_status, 
        a.id as appointment_id, a.scheduled_at, a.reason, a.latest_outcome,
        p.id as patient_id, p.full_name as patient_name, p.phone_e164 as patient_phone, p.phone_status as patient_phone_status,
        pr.display_name as provider_name
       FROM follow_up_tasks t
       JOIN appointments a ON t.appointment_id = a.id
       JOIN patients p ON t.patient_id = p.id
       JOIN providers pr ON a.provider_id = pr.id
       WHERE t.clinic_id = ? AND t.completed_at IS NULL AND a.voided_at IS NULL
         AND (t.status IN ('RESCHEDULE_REQUIRED', 'BLOCKED', 'RETRY') OR date(a.scheduled_at) <= date(?))
       ORDER BY a.scheduled_at ASC LIMIT 10;`,
      [req.user.clinic_id, todayStr]
    );

    res.json({
      data: {
        date: todayStr,
        metrics: {
          today_appointments: todayCount.cnt,
          tomorrow_appointments: tomorrowCount.cnt,
          confirmed: confirmedCount.cnt,
          retry: retryCount.cnt,
          reschedule_required: rescheduleRequiredCount.cnt,
          not_contacted: notContactedCount.cnt,
          pending_total: pendingTotalCount.cnt
        },
        needs_attention: needsAttentionList
      }
    });
  } catch (err) {
    console.error('Fetch overview error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch overview dashboard data.' } });
  }
});

export default router;
