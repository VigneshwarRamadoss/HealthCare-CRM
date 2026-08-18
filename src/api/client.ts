const API_BASE = '/api/v1';

let authToken: string | null = localStorage.getItem('apex_crm_token');

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('apex_crm_token', token);
  } else {
    localStorage.removeItem('apex_crm_token');
  }
}

export function getToken(): string | null {
  return authToken;
}

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.error?.message || 'An error occurred during request.';
    throw new Error(errorMsg);
  }

  return data.data;
}

// Dedicated API Methods
export const api = {
  // Auth
  login: (email: string, password: string) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  demoLogin: (role: string) => apiRequest('/auth/demo-login', { method: 'POST', body: JSON.stringify({ role }) }),
  getMe: () => apiRequest('/auth/me'),

  // Patients
  getPatients: (search?: string) => apiRequest(`/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getPatient: (id: string) => apiRequest(`/patients/${id}`),
  createPatient: (data: { full_name: string; phone: string; notes?: string }) => apiRequest('/patients', { method: 'POST', body: JSON.stringify(data) }),
  updatePatient: (id: string, data: any) => apiRequest(`/patients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getPatientTimeline: (id: string) => apiRequest(`/patients/${id}/timeline`),

  // Providers
  getProviders: () => apiRequest('/providers'),
  createProvider: (data: { display_name: string; specialty?: string }) => apiRequest('/providers', { method: 'POST', body: JSON.stringify(data) }),

  // Appointments
  getAppointments: (params?: { status?: string; provider_id?: string; date?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.provider_id) q.append('provider_id', params.provider_id);
    if (params?.date) q.append('date', params.date);
    return apiRequest(`/appointments?${q.toString()}`);
  },
  getAppointment: (id: string) => apiRequest(`/appointments/${id}`),
  createAppointment: (data: { patient_id: string; provider_id: string; scheduled_at: string; reason: string; notes?: string }) =>
    apiRequest('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  updateAppointment: (id: string, data: any) => apiRequest(`/appointments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  voidAppointment: (id: string) => apiRequest(`/appointments/${id}`, { method: 'DELETE' }),

  // Follow-ups & Call Interactions
  getPendingFollowUps: (params?: { timeframe?: string; provider_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.timeframe) q.append('timeframe', params.timeframe);
    if (params?.provider_id) q.append('provider_id', params.provider_id);
    return apiRequest(`/follow-ups/pending?${q.toString()}`);
  },
  getCompletedFollowUps: () => apiRequest('/follow-ups/completed'),
  recordInteraction: (appointmentId: string, data: { outcome: string; note?: string; retry_after?: string; still_required?: boolean }) =>
    apiRequest(`/appointments/${appointmentId}/interactions`, { method: 'POST', body: JSON.stringify(data) }),
  getInteractions: (appointmentId: string) => apiRequest(`/appointments/${appointmentId}/interactions`),

  // Reschedule
  rescheduleAppointment: (appointmentId: string, data: { scheduled_at: string; provider_id?: string; reason?: string; note?: string }) =>
    apiRequest(`/appointments/${appointmentId}/reschedule`, { method: 'POST', body: JSON.stringify(data) }),

  // Overview & Dashboard
  getOverview: () => apiRequest('/overview'),

  // Admin
  getUsers: () => apiRequest('/admin/users'),
  createUser: (data: any) => apiRequest('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => apiRequest(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getAuditLogs: () => apiRequest('/admin/audit-logs')
};
