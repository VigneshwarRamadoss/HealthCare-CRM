import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  Phone, 
  CheckCircle2, 
  PhoneOff, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  RefreshCw,
  UserCheck,
  FileText
} from 'lucide-react';
import { api } from '../api/client';
import { FollowUpTaskItem, InteractionOutcome } from '../types';

interface FollowUpQueueProps {
  onOpenReschedule: (appointment: any) => void;
  selectedTaskForCall?: any;
  clearSelectedTaskForCall?: () => void;
}

export const FollowUpQueue: React.FC<FollowUpQueueProps> = ({
  onOpenReschedule,
  selectedTaskForCall,
  clearSelectedTaskForCall
}) => {
  const [tasks, setTasks] = useState<FollowUpTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframeFilter, setTimeframeFilter] = useState<'all' | 'today' | 'tomorrow' | 'overdue'>('all');

  // Modal State for Recording Call Outcome
  const [activeCallTask, setActiveCallTask] = useState<FollowUpTaskItem | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<InteractionOutcome | null>(null);
  const [outcomeNote, setOutcomeNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.getPendingFollowUps({
        timeframe: timeframeFilter === 'all' ? undefined : timeframeFilter
      });
      setTasks(res);
    } catch (err) {
      console.error('Failed to load pending follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [timeframeFilter]);

  // Handle external call trigger (e.g. from Dashboard)
  useEffect(() => {
    if (selectedTaskForCall) {
      setActiveCallTask(selectedTaskForCall);
      if (clearSelectedTaskForCall) clearSelectedTaskForCall();
    }
  }, [selectedTaskForCall]);

  const handleInitiateCall = (task: FollowUpTaskItem) => {
    setActiveCallTask(task);
    setSelectedOutcome(null);
    setOutcomeNote('');

    // Trigger mobile dialer if available
    if (window.location.protocol !== 'https:' && /Mobi|Android/i.test(navigator.userAgent)) {
      window.location.href = `tel:${task.patient_phone}`;
    }
  };

  const handleSaveOutcome = async () => {
    if (!activeCallTask || !selectedOutcome) return;

    if (selectedOutcome === 'OTHER' && !outcomeNote.trim()) {
      alert('Please enter a short note explaining the call outcome.');
      return;
    }

    try {
      setSubmitting(true);

      // If outcome is WANTS_RESCHEDULE, trigger atomic reschedule modal
      if (selectedOutcome === 'WANTS_RESCHEDULE') {
        const currentTask = activeCallTask;
        setActiveCallTask(null);
        onOpenReschedule({
          id: currentTask.appointment_id,
          patient_name: currentTask.patient_name,
          reason: currentTask.reason,
          scheduled_at: currentTask.scheduled_at,
          row_version: currentTask.row_version
        });
        return;
      }

      await api.recordInteraction(activeCallTask.appointment_id, {
        outcome: selectedOutcome,
        note: outcomeNote.trim() || undefined
      });

      setActiveCallTask(null);
      setSelectedOutcome(null);
      setOutcomeNote('');
      fetchTasks(); // Refresh queue immediately
    } catch (err: any) {
      alert(err.message || 'Failed to record outcome');
    } finally {
      setSubmitting(false);
    }
  };

  const outcomeOptions: { key: InteractionOutcome; label: string; icon: any; color: string; desc: string }[] = [
    { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle2, color: '#10b981', desc: 'Patient confirmed return visit' },
    { key: 'NO_ANSWER', label: 'Did Not Pick Up', icon: PhoneOff, color: '#d97706', desc: 'Phone rang, no response' },
    { key: 'BUSY', label: 'Line Busy', icon: PhoneOff, color: '#f59e0b', desc: 'User busy or rejected call' },
    { key: 'CALL_BACK_LATER', label: 'Call Back Later', icon: Clock, color: '#0284c7', desc: 'Patient requested call at another time' },
    { key: 'WANTS_RESCHEDULE', label: 'Wants Reschedule', icon: RefreshCw, color: '#6366f1', desc: 'Patient wants a different date/time' },
    { key: 'CANCELLED', label: 'Cancelled', icon: XCircle, color: '#64748b', desc: 'Patient cancelled treatment visit' },
    { key: 'WRONG_NUMBER', label: 'Wrong Number', icon: AlertTriangle, color: '#e11d48', desc: 'Incorrect contact details provided' },
    { key: 'OTHER', label: 'Other', icon: HelpCircle, color: '#8b5cf6', desc: 'Custom outcome (requires note)' }
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pending Follow-Ups Queue</h1>
          <p className="page-description">
            Shared call queue for return visit confirmation and shift handover continuity
          </p>
        </div>
        <button className="btn-secondary" onClick={fetchTasks}>
          <RefreshCw size={16} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {(['all', 'today', 'tomorrow', 'overdue'] as const).map(tab => (
          <button
            key={tab}
            className={`btn-secondary ${timeframeFilter === tab ? 'active' : ''}`}
            style={{
              backgroundColor: timeframeFilter === tab ? '#0d9488' : '#ffffff',
              color: timeframeFilter === tab ? '#ffffff' : '#475569',
              borderColor: timeframeFilter === tab ? '#0d9488' : '#e2e8f0',
              fontWeight: 600,
              textTransform: 'capitalize'
            }}
            onClick={() => setTimeframeFilter(tab)}
          >
            {tab === 'all' ? 'All Pending' : tab}
          </button>
        ))}
      </div>

      {/* Work Queue List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#0d9488' }}>
          <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 8px auto' }} />
          Loading follow-up queue...
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 40, textAlign: 'center' }}>
          <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Work Queue Empty!</h3>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            All patient follow-ups in this timeframe have been resolved.
          </p>
        </div>
      ) : (
        <div className="queue-list">
          {tasks.map(task => (
            <div key={task.task_id} className="queue-card">
              <div className="patient-info-block">
                <div className="patient-avatar">
                  {task.patient_name.charAt(0)}
                </div>
                <div>
                  <div className="patient-name">
                    {task.patient_name}
                    <span className={`badge ${
                      task.task_status === 'RETRY' ? 'badge-retry' :
                      task.task_status === 'RESCHEDULE_REQUIRED' ? 'badge-reschedule' :
                      task.task_status === 'BLOCKED' ? 'badge-blocked' : 'badge-retry'
                    }`}>
                      {task.task_status === 'RETRY' ? 'Retry Needed' :
                       task.task_status === 'RESCHEDULE_REQUIRED' ? 'Reschedule Requested' :
                       task.task_status === 'BLOCKED' ? 'Wrong Number' : 'Pending Call'}
                    </span>
                  </div>
                  <div className="patient-phone">
                    📞 <strong style={{ color: '#0f172a' }}>{task.patient_phone}</strong> (Landline or Mobile)
                    {task.patient_phone_status === 'INVALID' && (
                      <span style={{ color: '#e11d48', fontWeight: 600, marginLeft: 8 }}>⚠️ Invalid Number</span>
                    )}
                  </div>
                  <div className="apt-reason">
                    <strong>Return Visit Reason:</strong> {task.reason} • <strong>Doctor:</strong> {task.provider_name}
                  </div>
                  {task.last_outcome && (
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, background: '#f8fafc', padding: '4px 8px', borderRadius: 6, display: 'inline-block' }}>
                      Last attempt: <strong style={{ color: '#0f172a' }}>{task.last_outcome}</strong> by {task.last_called_by || 'Staff'} ({new Date(task.last_call_at!).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })})
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0d9488' }}>
                  Scheduled: {new Date(task.scheduled_at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                <button className="call-action-btn" onClick={() => handleInitiateCall(task)}>
                  <PhoneCall size={18} />
                  <span>Call & Record Outcome</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record Call Outcome Drawer / Modal */}
      {activeCallTask && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PhoneCall size={20} color="#0d9488" />
                Record Call Outcome
              </h3>
              <button
                onClick={() => setActiveCallTask(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{activeCallTask.patient_name}</div>
                <div style={{ fontSize: 14, color: '#0d9488', fontWeight: 600, marginTop: 2 }}>📞 {activeCallTask.patient_phone}</div>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                  <strong>Reason:</strong> {activeCallTask.reason} • <strong>Dr:</strong> {activeCallTask.provider_name}
                </div>
              </div>

              <div className="form-label" style={{ marginBottom: 8 }}>Select What Happened After Call:</div>
              <div className="outcome-grid">
                {outcomeOptions.map(opt => {
                  const Icon = opt.icon;
                  const isSelected = selectedOutcome === opt.key;
                  return (
                    <button
                      key={opt.key}
                      className={`outcome-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedOutcome(opt.key)}
                    >
                      <Icon size={18} color={isSelected ? '#ffffff' : opt.color} />
                      <div>
                        <div>{opt.label}</div>
                        <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.8 }}>{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {(selectedOutcome === 'OTHER' || selectedOutcome === 'CALL_BACK_LATER' || selectedOutcome === 'NO_ANSWER') && (
                <div className="form-group" style={{ marginTop: 14 }}>
                  <label className="form-label">
                    {selectedOutcome === 'OTHER' ? 'Outcome Notes (Required):' : 'Optional Notes / Instructions:'}
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="e.g. Patient requested call after 4 PM..."
                    value={outcomeNote}
                    onChange={e => setOutcomeNote(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setActiveCallTask(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={!selectedOutcome || submitting}
                onClick={handleSaveOutcome}
              >
                {submitting ? 'Saving...' : 'Save & Next Patient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
