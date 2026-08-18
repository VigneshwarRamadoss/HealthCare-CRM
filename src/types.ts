export type UserRole = 'NURSE' | 'RECEPTIONIST' | 'DOCTOR' | 'ADMIN';

export interface User {
  id: string;
  clinic_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active?: number;
  last_login_at?: string | null;
}

export interface Clinic {
  id: string;
  name: string;
  timezone: string;
}

export interface Provider {
  id: string;
  clinic_id: string;
  display_name: string;
  specialty?: string | null;
  user_id?: string | null;
  is_active: number;
}

export type PhoneStatus = 'UNKNOWN' | 'VALID' | 'INVALID';

export interface Patient {
  id: string;
  clinic_id: string;
  full_name: string;
  phone_e164: string;
  phone_status: PhoneStatus;
  notes?: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  voided_at?: string | null;
  total_appointments?: number;
}

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'SUPERSEDED' | 'COMPLETED' | 'VOIDED';

export type InteractionOutcome =
  | 'CONFIRMED'
  | 'NO_ANSWER'
  | 'BUSY'
  | 'DISCONNECTED'
  | 'CALL_BACK_LATER'
  | 'WANTS_RESCHEDULE'
  | 'CANCELLED'
  | 'WRONG_NUMBER'
  | 'OTHER';

export type FollowUpTaskStatus = 'PENDING' | 'RETRY' | 'RESCHEDULE_REQUIRED' | 'COMPLETED' | 'CANCELLED' | 'BLOCKED';

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  provider_id: string;
  scheduled_at: string;
  reason: string;
  notes?: string | null;
  status: AppointmentStatus;
  latest_outcome?: InteractionOutcome | null;
  created_by_user_id: string;
  updated_by_user_id: string;
  rescheduled_from_appointment_id?: string | null;
  rescheduled_to_appointment_id?: string | null;
  row_version: number;
  created_at: string;
  updated_at: string;
  patient_name?: string;
  patient_phone?: string;
  patient_phone_status?: PhoneStatus;
  patient_notes?: string | null;
  provider_name?: string;
  task_id?: string;
  task_status?: FollowUpTaskStatus;
  retry_after?: string | null;
  interactions?: Interaction[];
}

export interface Interaction {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_id: string;
  performed_by_user_id: string;
  performed_by_name?: string;
  type: string;
  outcome: InteractionOutcome;
  note?: string | null;
  occurred_at: string;
  created_at: string;
  appointment_reason?: string;
}

export interface FollowUpTaskItem {
  task_id: string;
  task_status: FollowUpTaskStatus;
  due_at?: string | null;
  retry_after?: string | null;
  task_created_at: string;
  appointment_id: string;
  scheduled_at: string;
  reason: string;
  appointment_notes?: string | null;
  appointment_status: AppointmentStatus;
  latest_outcome?: InteractionOutcome | null;
  row_version: number;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  patient_phone_status: PhoneStatus;
  patient_notes?: string | null;
  provider_id: string;
  provider_name: string;
  last_outcome?: InteractionOutcome | null;
  last_call_at?: string | null;
  last_called_by?: string | null;
}

export interface TimelineEvent {
  id: string;
  type: 'APPOINTMENT_SCHEDULED' | 'CALL_INTERACTION';
  timestamp: string;
  title: string;
  subtitle: string;
  note?: string | null;
  status?: string;
  outcome?: string;
}

export interface OverviewMetrics {
  today_appointments: number;
  tomorrow_appointments: number;
  confirmed: number;
  retry: number;
  reschedule_required: number;
  not_contacted: number;
  pending_total: number;
}

export interface OverviewData {
  date: string;
  metrics: OverviewMetrics;
  needs_attention: FollowUpTaskItem[];
}

export interface AuditEvent {
  id: string;
  clinic_id: string;
  actor_user_id: string;
  actor_name: string;
  actor_role: string;
  entity_type: string;
  entity_id: string;
  action: string;
  before_json?: string | null;
  after_json?: string | null;
  occurred_at: string;
}
