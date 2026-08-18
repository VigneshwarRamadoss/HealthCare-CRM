import React, { useEffect, useState } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  PhoneOff, 
  RefreshCw, 
  AlertCircle, 
  PhoneCall, 
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { api } from '../api/client';
import { OverviewData } from '../types';
import { useAuth } from '../context/AuthContext';

interface DashboardProps {
  onSelectPending: () => void;
  onOpenCallModal: (task: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectPending, onOpenCallModal }) => {
  const { user } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await api.getOverview();
      setData(res);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [user]);

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ color: '#0d9488', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          <RefreshCw className="animate-spin" size={24} />
          Loading operational dashboard...
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    today_appointments: 0,
    tomorrow_appointments: 0,
    confirmed: 0,
    retry: 0,
    reschedule_required: 0,
    not_contacted: 0,
    pending_total: 0
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clinic Operational Overview</h1>
          <p className="page-description">
            Shared operational memory for patient return visits • Role: <strong style={{ color: '#0d9488' }}>{user?.role}</strong>
          </p>
        </div>
        <button className="btn-secondary" onClick={fetchOverview}>
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Operational Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card" style={{ borderLeft: '4px solid #0d9488' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label">Today's Visits</span>
            <Calendar size={18} color="#0d9488" />
          </div>
          <div className="metric-value">{metrics.today_appointments}</div>
          <div className="metric-sub">Scheduled for today</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label">Tomorrow's Visits</span>
            <Clock size={18} color="#0284c7" />
          </div>
          <div className="metric-value">{metrics.tomorrow_appointments}</div>
          <div className="metric-sub">Scheduled for tomorrow</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label">Confirmed</span>
            <CheckCircle2 size={18} color="#16a34a" />
          </div>
          <div className="metric-value" style={{ color: '#16a34a' }}>{metrics.confirmed}</div>
          <div className="metric-sub">Patient confirmed attendance</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #d97706' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label">No Answer / Retry</span>
            <PhoneOff size={18} color="#d97706" />
          </div>
          <div className="metric-value" style={{ color: '#d97706' }}>{metrics.retry}</div>
          <div className="metric-sub">Pending retry call</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #4f46e5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label">Wants Reschedule</span>
            <RefreshCw size={18} color="#4f46e5" />
          </div>
          <div className="metric-value" style={{ color: '#4f46e5' }}>{metrics.reschedule_required}</div>
          <div className="metric-sub">Needs new date/time</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label">Pending Total</span>
            <AlertCircle size={18} color="#dc2626" />
          </div>
          <div className="metric-value" style={{ color: '#dc2626' }}>{metrics.pending_total}</div>
          <div className="metric-sub">Unresolved work in queue</div>
        </div>
      </div>

      {/* Needs Attention Queue Section */}
      <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={20} color="#0d9488" />
              Needs Attention Queue
            </h2>
            <p style={{ fontSize: 13, color: '#64748b' }}>
              Immediate patient return appointments requiring call follow-up or rescheduling
            </p>
          </div>
          <button className="btn-secondary" onClick={onSelectPending}>
            <span>View All Pending ({metrics.pending_total})</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {data?.needs_attention.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
            <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 12px auto', display: 'block' }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>All Urgent Follow-Ups Clear!</h3>
            <p style={{ fontSize: 13, marginTop: 4 }}>No pending calls or unresolved patient returns right now.</p>
          </div>
        ) : (
          <div className="queue-list">
            {data?.needs_attention.map(item => (
              <div key={item.task_id} className="queue-card">
                <div className="patient-info-block">
                  <div className="patient-avatar">
                    {item.patient_name.charAt(0)}
                  </div>
                  <div>
                    <div className="patient-name">
                      {item.patient_name}
                      <span className={`badge ${
                        item.task_status === 'RETRY' ? 'badge-retry' :
                        item.task_status === 'RESCHEDULE_REQUIRED' ? 'badge-reschedule' :
                        item.task_status === 'BLOCKED' ? 'badge-blocked' : 'badge-retry'
                      }`}>
                        {item.task_status === 'RETRY' ? 'Needs Retry' :
                         item.task_status === 'RESCHEDULE_REQUIRED' ? 'Wants Reschedule' :
                         item.task_status === 'BLOCKED' ? 'Wrong Number / Blocked' : 'Pending Call'}
                      </span>
                    </div>
                    <div className="patient-phone">
                      📞 {item.patient_phone} {item.patient_phone_status === 'INVALID' && <strong style={{ color: '#e11d48' }}>(Invalid Phone)</strong>}
                    </div>
                    <div className="apt-reason">
                      <strong>Return Reason:</strong> {item.reason} • <strong>Doctor:</strong> {item.provider_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      Scheduled: {new Date(item.scheduled_at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button className="call-action-btn" onClick={() => onOpenCallModal(item)}>
                    <PhoneCall size={16} />
                    <span>Call Patient</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
