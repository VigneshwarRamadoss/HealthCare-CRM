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
  FileText,
  Clock,
  User as UserIcon,
  Phone
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
  const [appointments, setAppointments] = useState<any[]>([]);
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
      const [timelineEvents, patientDetail] = await Promise.all([
        api.getPatientTimeline(patient.id),
        api.getPatient(patient.id)
      ]);
      setTimeline(timelineEvents);
      setAppointments(patientDetail.appointments || []);
    } catch (err) {
      console.error('Failed to fetch patient details:', err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const upcomingAppointments = appointments.filter(a => new Date(a.scheduled_at) >= new Date() && a.status !== 'COMPLETED' && a.status !== 'CANCELLED');

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <div className="page-header" style={{ flexShrink: 0, marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Patients Directory & Timeline</h1>
          <p className="page-description">
            Complete patient profiles, upcoming appointments, and chronological activity stream
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, flex: 1, minHeight: 0 }}>
        {/* Left Side: Master List */}
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
            <div className="search-box" style={{ width: '100%' }}>
              <Search size={16} color="#64748b" />
              <input
                type="text"
                className="search-input"
                placeholder="Search patient or phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {loadingPatients ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Loading directory...</div>
            ) : patients.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No patients found</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {patients.map(p => {
                  const isSelected = selectedPatient?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPatient(p)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: '1px solid',
                        borderColor: isSelected ? '#0d9488' : 'transparent',
                        backgroundColor: isSelected ? '#f0fdfa' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div className="patient-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
                        {p.full_name.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: isSelected ? '#0f172a' : '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.full_name}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={10} /> {p.phone_e164}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detail View */}
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedPatient ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* Profile Header */}
              <div style={{ padding: '24px 32px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div className="patient-avatar" style={{ width: 64, height: 64, fontSize: 24, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                      {selectedPatient.full_name.charAt(0)}
                    </div>
                    <div>
                      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>{selectedPatient.full_name}</h2>
                      <div style={{ fontSize: 15, color: '#475569', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Phone size={14} />
                        {selectedPatient.phone_e164}
                        {selectedPatient.phone_status === 'INVALID' && (
                          <span style={{ color: '#e11d48', fontWeight: 600, marginLeft: 8, fontSize: 13, background: '#ffe4e6', padding: '2px 8px', borderRadius: 12 }}>
                            Invalid Number
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button className="btn-primary" onClick={() => onOpenNewAppointmentForPatient?.(selectedPatient.id)}>
                    <Plus size={16} />
                    <span>New Appointment</span>
                  </button>
                </div>

                {selectedPatient.notes && (
                  <div style={{ marginTop: 20, padding: 16, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', color: '#475569', fontSize: 14 }}>
                    <strong style={{ color: '#0f172a' }}>Notes:</strong> {selectedPatient.notes}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', padding: 32, gap: 40 }}>
                {/* Left Column: Upcoming & Metrics */}
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={18} color="#0d9488" />
                    Upcoming Appointments
                  </h3>
                  
                  {upcomingAppointments.length === 0 ? (
                    <div style={{ padding: 24, background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                      No upcoming appointments scheduled.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {upcomingAppointments.map(apt => (
                        <div key={apt.id} style={{ padding: 16, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', borderLeft: '4px solid #0d9488', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.03)' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 15 }}>{apt.reason}</div>
                          <div style={{ fontSize: 13, color: '#475569', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Clock size={14} color="#64748b" />
                            {new Date(apt.scheduled_at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <UserIcon size={14} color="#64748b" />
                            Dr. {apt.provider_name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column: Timeline Stream */}
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <History size={18} color="#0d9488" />
                    Chronological Activity Stream
                  </h3>

                  {loadingTimeline ? (
                    <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>Loading activity...</div>
                  ) : timeline.length === 0 ? (
                    <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>No timeline events recorded yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'relative', paddingLeft: 24 }}>
                      <div style={{ position: 'absolute', left: 9, top: 10, bottom: 10, width: 2, backgroundColor: '#e2e8f0' }} />

                      {timeline.map((event, idx) => (
                        <div key={event.id || idx} style={{ position: 'relative' }}>
                          <div style={{
                            position: 'absolute',
                            left: -24,
                            top: 4,
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            backgroundColor: event.type === 'APPOINTMENT_SCHEDULED' ? '#0d9488' : '#0284c7',
                            border: '3px solid #ffffff'
                          }} />

                          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{event.title}</div>
                              <div style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', marginLeft: 16 }}>
                                {new Date(event.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>

                            <div style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>{event.subtitle}</div>

                            {event.note && (
                              <div style={{ fontSize: 13, background: '#f8fafc', borderLeft: '3px solid #cbd5e1', padding: '8px 12px', borderRadius: '0 4px 4px 0', marginTop: 12, color: '#334155' }}>
                                <em>"{event.note}"</em>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <Users size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 16, fontWeight: 500, color: '#475569' }}>Select a patient to view details</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>Access profile, appointments, and activity history</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
