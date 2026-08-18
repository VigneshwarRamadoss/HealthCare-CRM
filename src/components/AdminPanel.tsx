import React, { useState, useEffect } from 'react';
import { Shield, Users, Stethoscope, FileText, UserPlus, RefreshCw, CheckCircle2, Lock } from 'lucide-react';
import { api } from '../api/client';
import { User, Provider, AuditEvent } from '../types';
import { useAuth } from '../context/AuthContext';

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'providers' | 'audit'>('users');

  const [users, setUsers] = useState<User[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // New User Form State
  const [showAddUser, setShowAddUser] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'NURSE' | 'RECEPTIONIST' | 'DOCTOR' | 'ADMIN'>('NURSE');

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [uRes, pRes, aRes] = await Promise.all([
        api.getUsers(),
        api.getProviders(),
        api.getAuditLogs()
      ]);
      setUsers(uRes);
      setProviders(pRes);
      setAuditLogs(aRes);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({
        full_name: newFullName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole
      });
      setShowAddUser(false);
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: 60 }}>
        <Lock size={48} color="#e11d48" style={{ margin: '0 auto 12px auto' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Access Restricted</h2>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
          Only Clinic Administrators have permission to access system user management and audit logs.
        </p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clinic Administration & Audit Controls</h1>
          <p className="page-description">
            Manage staff credentials, attending doctors, and inspect sensitive audit history
          </p>
        </div>
        <button className="btn-secondary" onClick={fetchAdminData}>
          <RefreshCw size={16} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button
          className={`btn-secondary ${activeTab === 'users' ? 'active' : ''}`}
          style={{
            backgroundColor: activeTab === 'users' ? '#0d9488' : '#ffffff',
            color: activeTab === 'users' ? '#ffffff' : '#475569',
            borderColor: activeTab === 'users' ? '#0d9488' : '#e2e8f0',
            fontWeight: 600
          }}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} />
          <span>Staff Accounts ({users.length})</span>
        </button>

        <button
          className={`btn-secondary ${activeTab === 'providers' ? 'active' : ''}`}
          style={{
            backgroundColor: activeTab === 'providers' ? '#0d9488' : '#ffffff',
            color: activeTab === 'providers' ? '#ffffff' : '#475569',
            borderColor: activeTab === 'providers' ? '#0d9488' : '#e2e8f0',
            fontWeight: 600
          }}
          onClick={() => setActiveTab('providers')}
        >
          <Stethoscope size={16} />
          <span>Doctors / Providers ({providers.length})</span>
        </button>

        <button
          className={`btn-secondary ${activeTab === 'audit' ? 'active' : ''}`}
          style={{
            backgroundColor: activeTab === 'audit' ? '#0d9488' : '#ffffff',
            color: activeTab === 'audit' ? '#ffffff' : '#475569',
            borderColor: activeTab === 'audit' ? '#0d9488' : '#e2e8f0',
            fontWeight: 600
          }}
          onClick={() => setActiveTab('audit')}
        >
          <FileText size={16} />
          <span>System Audit Logs ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Staff Accounts */}
      {activeTab === 'users' && (
        <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Clinic Staff Members</h3>
            <button className="btn-primary" onClick={() => setShowAddUser(true)}>
              <UserPlus size={16} />
              <span>Add Staff Account</span>
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>Name</th>
                <th style={{ padding: '10px 14px' }}>Email</th>
                <th style={{ padding: '10px 14px' }}>Role</th>
                <th style={{ padding: '10px 14px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px', fontWeight: 600, color: '#0f172a' }}>{u.full_name}</td>
                  <td style={{ padding: '14px', color: '#475569' }}>{u.email}</td>
                  <td style={{ padding: '14px' }}>
                    <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '14px', color: u.is_active ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                    {u.is_active ? 'Active' : 'Disabled'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Providers */}
      {activeTab === 'providers' && (
        <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>Attending Dentists & Specialists</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {providers.map(pr => (
              <div key={pr.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 18, background: '#f8fafc' }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{pr.display_name}</div>
                <div style={{ fontSize: 13, color: '#0d9488', fontWeight: 600, marginTop: 4 }}>
                  Specialty: {pr.specialty || 'General Dentistry'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Audit Logs */}
      {activeTab === 'audit' && (
        <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>System Audit History Stream</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>
                <th style={{ padding: '10px' }}>Timestamp</th>
                <th style={{ padding: '10px' }}>Actor</th>
                <th style={{ padding: '10px' }}>Action</th>
                <th style={{ padding: '10px' }}>Entity</th>
                <th style={{ padding: '10px' }}>Snapshot Payload</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', whiteSpace: 'nowrap', color: '#64748b' }}>
                    {new Date(log.occurred_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#0f172a' }}>
                    {log.actor_name} ({log.actor_role})
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ fontWeight: 700, color: '#0d9488' }}>{log.action}</span>
                  </td>
                  <td style={{ padding: '12px', color: '#475569' }}>
                    {log.entity_type} ({log.entity_id.slice(0, 8)}...)
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: 11, color: '#334155' }}>
                    {log.after_json || log.before_json || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">Create Staff User Account</h3>
              <button onClick={() => setShowAddUser(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input type="text" className="form-input" required value={newFullName} onChange={e => setNewFullName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input type="email" className="form-input" required value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input type="password" className="form-input" required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role Assignment *</label>
                  <select className="form-select" value={newRole} onChange={e => setNewRole(e.target.value as any)}>
                    <option value="NURSE">NURSE (Call Queue & Outcome Recording)</option>
                    <option value="RECEPTIONIST">RECEPTIONIST (Add Visits, Reschedule, Calls)</option>
                    <option value="DOCTOR">DOCTOR (View Scheduled Returns & History)</option>
                    <option value="ADMIN">ADMIN (Full Operational & Security Access)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddUser(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create User Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
