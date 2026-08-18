import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  PhoneCall, 
  Users, 
  History, 
  Settings, 
  Plus, 
  Search, 
  Stethoscope, 
  UserCheck, 
  Shield, 
  Phone,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface NavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenNewAppointment: () => void;
  onSelectPatient: (patientId: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  setCurrentTab,
  onOpenNewAppointment
}) => {
  const { user, clinic, loginDemoPersona } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, roles: ['NURSE', 'RECEPTIONIST', 'DOCTOR', 'ADMIN'] },
    { id: 'pending', label: 'Follow-Ups', icon: PhoneCall, roles: ['NURSE', 'RECEPTIONIST', 'DOCTOR', 'ADMIN'], badge: 'Due' },
    { id: 'patients', label: 'Patients', icon: Users, roles: ['NURSE', 'RECEPTIONIST', 'DOCTOR', 'ADMIN'] },
    { id: 'admin', label: 'Clinic Admin', icon: Settings, roles: ['ADMIN'] }
  ];

  const allowedNav = navItems.filter(item => user && item.roles.includes(user.role));

  const roleColors: Record<UserRole, string> = {
    NURSE: '#0d9488',
    RECEPTIONIST: '#0284c7',
    DOCTOR: '#7c3aed',
    ADMIN: '#e11d48'
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-icon" style={{ background: 'transparent', padding: 0 }}>
            <img src="/favicon.png" alt="Logo" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
          </div>
          <div>
            <div className="brand-title">DotX</div>
            <div className="brand-subtitle">Patient Follow-Up CRM</div>
          </div>
        </div>

        <div className="sidebar-nav">
          {allowedNav.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setCurrentTab(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Current Active Persona Info */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                backgroundColor: roleColors[user?.role || 'NURSE'],
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: 14
              }}
            >
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.full_name}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: roleColors[user?.role || 'NURSE']
                }} />
                {user?.role}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Top Header */}
      <header className="top-header">
        <div className="search-box">
          <Search size={18} color="#64748b" />
          <input
            type="text"
            className="search-input"
            placeholder="Search patient name or phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setCurrentTab('patients')}
          />
        </div>

        <div className="header-actions">
          {/* Demo Persona Quick Switcher */}
          <div className="persona-switcher">
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', paddingLeft: 6 }}>Demo Persona:</span>
            <button
              className={`persona-btn ${user?.role === 'NURSE' ? 'active' : ''}`}
              onClick={() => loginDemoPersona('NURSE')}
            >
              Nurse
            </button>
            <button
              className={`persona-btn ${user?.role === 'RECEPTIONIST' ? 'active' : ''}`}
              onClick={() => loginDemoPersona('RECEPTIONIST')}
            >
              Reception
            </button>
            <button
              className={`persona-btn ${user?.role === 'DOCTOR' ? 'active' : ''}`}
              onClick={() => loginDemoPersona('DOCTOR')}
            >
              Doctor
            </button>
            <button
              className={`persona-btn ${user?.role === 'ADMIN' ? 'active' : ''}`}
              onClick={() => loginDemoPersona('ADMIN')}
            >
              Admin
            </button>
          </div>

          <button className="btn-primary" onClick={onOpenNewAppointment}>
            <Plus size={18} />
            <span>Add Appointment</span>
          </button>
        </div>
      </header>

      {/* Mobile Bottom Bar */}
      <div className="mobile-bottom-nav">
        <button
          className={`mobile-nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentTab('dashboard')}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </button>
        <button
          className={`mobile-nav-item ${currentTab === 'pending' ? 'active' : ''}`}
          onClick={() => setCurrentTab('pending')}
        >
          <PhoneCall size={20} />
          <span>Follow-Ups</span>
        </button>
        <button
          className={`mobile-nav-item ${currentTab === 'patients' ? 'active' : ''}`}
          onClick={() => setCurrentTab('patients')}
        >
          <Users size={20} />
          <span>Patients</span>
        </button>
        <button
          className="mobile-nav-item"
          onClick={onOpenNewAppointment}
          style={{ color: '#0d9488' }}
        >
          <Plus size={22} />
          <span>New</span>
        </button>
      </div>
    </>
  );
};
