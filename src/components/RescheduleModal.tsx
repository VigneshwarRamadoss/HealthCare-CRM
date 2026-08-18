import React, { useState, useEffect } from 'react';
import { RefreshCw, Calendar, Clock, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { Provider } from '../types';

interface RescheduleModalProps {
  appointment: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({ appointment, onClose, onSuccess }) => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (appointment) {
      api.getProviders().then(setProviders).catch(console.error);

      // Default new scheduled date to 3 days in future at 11:00 AM
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 3);
      newDate.setHours(11, 0, 0, 0);
      setScheduledAt(newDate.toISOString().slice(0, 16));

      setReason(appointment.reason || '');
    }
  }, [appointment]);

  if (!appointment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAt) {
      alert('Please select a new date and time.');
      return;
    }

    try {
      setSubmitting(true);
      await api.rescheduleAppointment(appointment.id || appointment.appointment_id, {
        scheduled_at: new Date(scheduledAt).toISOString(),
        provider_id: selectedProviderId || undefined,
        reason: reason.trim() || undefined,
        note: note.trim() || 'Patient requested reschedule.'
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to reschedule appointment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={20} color="#6366f1" />
            Reschedule Return Visit
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#64748b' }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ background: '#e0e7ff', padding: 14, borderRadius: 10, border: '1px solid #c7d2fe', marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#3730a3' }}>
                Rescheduling for: {appointment.patient_name}
              </div>
              <div style={{ fontSize: 13, color: '#4338ca', marginTop: 2 }}>
                Current Visit: {new Date(appointment.scheduled_at).toLocaleString()} • ({appointment.reason})
              </div>
              <div style={{ fontSize: 12, color: '#4f46e5', marginTop: 6, fontStyle: 'italic' }}>
                ℹ️ The current appointment record will be preserved as <strong>SUPERSEDED</strong> for history. A new active appointment will be created and linked automatically.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Return Date & Time *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Doctor / Provider (Optional Change):</label>
              <select
                className="form-select"
                value={selectedProviderId}
                onChange={e => setSelectedProviderId(e.target.value)}
              >
                <option value="">Keep original doctor</option>
                {providers.map(pr => (
                  <option key={pr.id} value={pr.id}>
                    {pr.display_name} ({pr.specialty || 'Dentist'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Reason / Purpose for New Date:</label>
              <input
                type="text"
                className="form-input"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Staff Reschedule Note / Call Context:</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="e.g. Patient out of town, requested Friday morning..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ background: '#4f46e5' }} disabled={submitting}>
              {submitting ? 'Rescheduling...' : 'Confirm Atomic Reschedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
