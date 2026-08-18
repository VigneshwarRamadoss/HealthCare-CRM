import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { FollowUpQueue } from './components/FollowUpQueue';
import { PatientTimeline } from './components/PatientTimeline';
import { AdminPanel } from './components/AdminPanel';
import { AppointmentModal } from './components/AppointmentModal';
import { RescheduleModal } from './components/RescheduleModal';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Modal States
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [rescheduleAppointmentTarget, setRescheduleAppointmentTarget] = useState<any>(null);
  const [selectedTaskForCall, setSelectedTaskForCall] = useState<any>(null);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#0d9488', fontWeight: 600 }}>
        Loading DotX...
      </div>
    );
  }

  const handleOpenCallModalFromDashboard = (task: any) => {
    setSelectedTaskForCall(task);
    setCurrentTab('pending');
  };

  return (
    <div className="app-container">
      <Navigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenNewAppointment={() => setIsAppointmentModalOpen(true)}
        onSelectPatient={() => setCurrentTab('patients')}
      />

      <main className="main-wrapper">
        {currentTab === 'dashboard' && (
          <Dashboard
            onSelectPending={() => setCurrentTab('pending')}
            onOpenCallModal={handleOpenCallModalFromDashboard}
          />
        )}

        {currentTab === 'pending' && (
          <FollowUpQueue
            onOpenReschedule={(apt) => setRescheduleAppointmentTarget(apt)}
            selectedTaskForCall={selectedTaskForCall}
            clearSelectedTaskForCall={() => setSelectedTaskForCall(null)}
          />
        )}

        {currentTab === 'patients' && (
          <PatientTimeline
            onOpenNewAppointmentForPatient={() => setIsAppointmentModalOpen(true)}
          />
        )}

        {currentTab === 'admin' && <AdminPanel />}
      </main>

      {/* Create Appointment Modal */}
      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        onSuccess={() => {
          setIsAppointmentModalOpen(false);
          // If on pending view, auto refresh
          if (currentTab === 'pending') {
            setCurrentTab('dashboard');
            setTimeout(() => setCurrentTab('pending'), 50);
          }
        }}
      />

      {/* Reschedule Modal */}
      {rescheduleAppointmentTarget && (
        <RescheduleModal
          appointment={rescheduleAppointmentTarget}
          onClose={() => setRescheduleAppointmentTarget(null)}
          onSuccess={() => {
            setRescheduleAppointmentTarget(null);
            if (currentTab === 'pending') {
              setCurrentTab('dashboard');
              setTimeout(() => setCurrentTab('pending'), 50);
            }
          }}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
