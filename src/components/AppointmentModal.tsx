import React, { useState, useEffect } from 'react';
import { Calendar, UserPlus, Search, Stethoscope, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';
import { Patient, Provider } from '../types';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [patientSearch, setPatientSearch] = useState('');

  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const dentalReasonTemplates = [
    'Post-extraction review',
    'Root canal stage 2 review',
    'Crown / bridge fitting',
    'Implant placement follow-up',
    'Orthodontic wire adjustment',
    'Post-surgical check',
    'Scaling / periodontal review',
    'Denture fitting review',
    'General treatment review'
  ];

  useEffect(() => {
    if (isOpen) {
      api.getProviders().then(setProviders).catch(console.error);
      api.getPatients().then(res => {
        setPatients(res);
        if (res.length > 0) setSelectedPatientId(res[0].id);
      }).catch(console.error);

      // Default scheduled date to tomorrow at 11:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(11, 0, 0, 0);
      setScheduledAt(tomorrow.toISOString().slice(0, 16));
    }
  }, [isOpen]);

  useEffect(() => {
    if (providers.length > 0 && !selectedProviderId) {
      setSelectedProviderId(providers[0].id);
    }
  }, [providers]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAt || !reason || (!selectedPatientId && mode === 'EXISTING') || (mode === 'NEW' && (!newPatientName || !newPatientPhone))) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      let targetPatientId = selectedPatientId;

      if (mode === 'NEW') {
        const newPatientRes = await api.createPatient({
          full_name: newPatientName.trim(),
          phone: newPatientPhone.trim(),
          notes: notes.trim() || undefined
        });
        targetPatientId = newPatientRes.id;
        if (newPatientRes.meta?.duplicate_warning) {
          setDuplicateWarning(newPatientRes.meta.duplicate_warning);
        }
      }

      await api.createAppointment({
        patient_id: targetPatientId,
        provider_id: selectedProviderId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        reason,
        notes: notes.trim() || undefined
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create appointment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={20} color="#0d9488" />
            Add Patient Return Appointment
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#64748b' }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Mode Switcher */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              <button
                type="button"
                className={`btn-secondary ${mode === 'EXISTING' ? 'active' : ''}`}
                style={{
                  flex: 1,
                  backgroundColor: mode === 'EXISTING' ? '#0d9488' : '#f8fafc',
                  color: mode === 'EXISTING' ? '#ffffff' : '#475569',
                  borderColor: mode === 'EXISTING' ? '#0d9488' : '#e2e8f0',
                  fontWeight: 600
                }}
                onClick={() => setMode('EXISTING')}
              >
                Existing Patient
              </button>
              <button
                type="button"
                className={`btn-secondary ${mode === 'NEW' ? 'active' : ''}`}
                style={{
                  flex: 1,
                  backgroundColor: mode === 'NEW' ? '#0d9488' : '#f8fafc',
                  color: mode === 'NEW' ? '#ffffff' : '#475569',
                  borderColor: mode === 'NEW' ? '#0d9488' : '#e2e8f0',
                  fontWeight: 600
                }}
                onClick={() => setMode('NEW')}
              >
                + New Patient
              </button>
            </div>

            {mode === 'EXISTING' ? (
              <div className="form-group">
                <label className="form-label">Select Patient:</label>
                <select
                  className="form-select"
                  value={selectedPatientId}
                  onChange={e => setSelectedPatientId(e.target.value)}
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.phone_e164})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Full Patient Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Arun Kumar"
                    value={newPatientName}
                    onChange={e => setNewPatientName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. +91 98765 43210"
                    value={newPatientPhone}
                    onChange={e => setNewPatientPhone(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Attending Doctor / Provider *</label>
              <select
                className="form-select"
                value={selectedProviderId}
                onChange={e => setSelectedProviderId(e.target.value)}
                required
              >
                {providers.map(pr => (
                  <option key={pr.id} value={pr.id}>
                    {pr.display_name} ({pr.specialty || 'Dentist'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Return Date & Time *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reason for Return Visit *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Root canal review"
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {dentalReasonTemplates.slice(0, 4).map(tpl => (
                  <button
                    key={tpl}
                    type="button"
                    style={{
                      fontSize: 11,
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      color: '#334155'
                    }}
                    onClick={() => setReason(tpl)}
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Optional Clinical Context / Notes:</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Short note for staff..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Save Return Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
