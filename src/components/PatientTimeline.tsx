import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  History, 
  Calendar, 
  PhoneCall, 
  UserCheck, 
  RefreshCw, 
  Plus, 
  CheckCircle2, 
  PhoneOff, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { api } from '../api/client';
import { Patient, TimelineEvent } from '../types';

interface PatientTimelineProps {
  onOpenNewAppointmentForPatient?: (patientId: string) => void;
}

export const PatientTimeline: React.FC<PatientTimelineProps> = ({ onOpenNewAppointmentForPatient }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const fetchPatients = async (queryStr = '') => {
    try {
      setLoadingPatients(true);
      const res = await api.getPatients(queryStr);
      setPatients(res);
      if (res.length > 0 && !selectedPatient) {
        handleSelectPatient(res[0]);
      }
    } catch (err) {
      console.error('Failed to load patients:', err);
    } finally {
      setLoadingPatients(false);
    }
  };

  useEffect(() => {
    fetchPatients(search);
  }, [search]);

  const handleSelectPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    try {
      setLoadingTimeline(true);
      const events = await api.getPatientTimeline(patient.id);
      setTimeline(events);
    } catch (err) {
      console.error('Failed to fetch patient timeline:', err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Patient Records & Activity Timeline</h1>
          <p className="page-description">
            Append-oriented activity history preserving past call attempts, appointments, and staff attributions
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        {/* Left Side: Patients Directory */}
        <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="search-box" style={{ width: '100%', marginBottom: 14 }}>
            <Search size={16} color="#64748b" />
            <input
              type="text"
              className="search-input"
              placeholder="Search patient or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 580, overflowY: 'auto' }}>
            {loadingPatients ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Loading directory...</div>
            ) : patients.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No patients found</div>
            ) : (
              patients.map(p => {
                const isSelected = selectedPatient?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      borderRadius: 10,
                      border: '1px solid',
                      borderColor: isSelected ? '#0d9488' : '#e2e8f0',
                      backgroundColor: isSelected ? '#ccfbf1' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div className="patient-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
                      {p.full_name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.full_name}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        📞 {p.phone_e164}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Selected Patient Details & Timeline */}
        <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {selectedPatient ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: 18, marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{selectedPatient.full_name}</h2>
                  <div style={{ fontSize: 14, color: '#0d9488', fontWeight: 600, marginTop: 4 }}>
                    📞 {selectedPatient.phone_e164}
                    {selectedPatient.phone_status === 'INVALID' && (
                      <span style={{ color: '#e11d48', fontWeight: 700, marginLeft: 8 }}>⚠️ Invalid Phone Number</span>
                    )}
                  </div>
                  {selectedPatient.notes && (
                    <div style={{ fontSize: 13, color: '#475569', marginTop: 6, fontStyle: 'italic' }}>
                      Notes: "{selectedPatient.notes}"
                    </div>
                  )}
                </div>
              </div>

              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={18} color="#0d9488" />
                Chronological Activity Stream
              </h3>

              {loadingTimeline ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>Loading activity history...</div>
              ) : timeline.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>No timeline events recorded yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', paddingLeft: 20 }}>
                  <div style={{ position: 'absolute', left: 7, top: 10, bottom: 10, width: 2, backgroundColor: '#e2e8f0' }} />

                  {timeline.map((event, idx) => (
                    <div key={event.id || idx} style={{ position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        left: -20,
                        top: 2,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: event.type === 'APPOINTMENT_SCHEDULED' ? '#0d9488' : '#0284c7',
                        border: '2px solid #ffffff'
                      }} />

                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{event.title}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            {new Date(event.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{event.subtitle}</div>

                        {event.note && (
                          <div style={{ fontSize: 12, background: '#ffffff', border: '1px solid #e2e8f0', padding: 8, borderRadius: 6, marginTop: 8, color: '#334155' }}>
                            💬 <em>"{event.note}"</em>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
              Select a patient from the list to inspect timeline history.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
