import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Clinic } from '../types';
import { api, setToken, getToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  clinic: Clinic | null;
  loading: boolean;
  loginDemoPersona: (role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Auto load existing session or default to Nurse persona on boot
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = getToken();
        if (token) {
          const res = await api.getMe();
          setUser(res.user);
          setClinic(res.clinic);
        } else {
          // Default to Nurse persona for instant evaluation
          await loginDemoPersona('NURSE');
        }
      } catch (err) {
        console.warn('Auto auth failed, loading default demo persona...');
        await loginDemoPersona('NURSE');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const loginDemoPersona = async (role: UserRole) => {
    setLoading(true);
    try {
      const res = await api.demoLogin(role);
      setToken(res.token);
      setUser(res.user);

      const me = await api.getMe();
      setClinic(me.clinic);
    } catch (err) {
      console.error('Demo persona login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setClinic(null);
  };

  return (
    <AuthContext.Provider value={{ user, clinic, loading, loginDemoPersona, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
