# DATA_MODEL.md — Dental Patient Follow-Up

> **Product boundary:** A focused CRM-lite system for **dental clinics and hospitals** that manages patient return appointments and follow-up continuity. It is not a traditional sales CRM, EMR/EHR, or full Hospital Management System (HMS).

> **Primary product reference:** *Patient Follow-Up App MVP Requirements*.

> **UX reference:** Zoho CRM Nextgen is used only for navigation and interaction patterns such as a unified/collapsible sidebar, a main work pane, global search/quick create, and contextual related-record history. Zoho's larger sales CRM feature set is intentionally excluded.

> **Notation:** **[ASSUMPTION]** marks a product/engineering decision introduced because the source requirements do not specify the detail.

## 1. Data Principles

- Relational database recommended.
- UUID primary keys.
- UTC storage timestamps; clinic time zone for display.
- Tenant ID on all tenant-owned records.
- Append-oriented interaction history.
- Soft delete/void for auditable business records.
- Server owns state transitions.

## 2. Enums

### UserRole
```text
NURSE
RECEPTIONIST
DOCTOR
ADMIN
```

### AppointmentStatus
```text
SCHEDULED
CONFIRMED
CANCELLED
SUPERSEDED
COMPLETED
VOIDED
```

### InteractionOutcome
```text
CONFIRMED
NO_ANSWER
BUSY
DISCONNECTED
CALL_BACK_LATER
WANTS_RESCHEDULE
CANCELLED
WRONG_NUMBER
OTHER
```

### FollowUpTaskStatus
```text
PENDING
RETRY
RESCHEDULE_REQUIRED
COMPLETED
CANCELLED
BLOCKED
```

### PhoneStatus
```text
UNKNOWN
VALID
INVALID
```

## 3. Table: clinics

| Field | Type | Rule |
|---|---|---|
| id | uuid | PK |
| name | varchar(150) | required |
| timezone | varchar(64) | required |
| is_active | boolean | default true |
| created_at | timestamptz | required |
| updated_at | timestamptz | required |

## 4. Table: users

| Field | Type | Rule |
|---|---|---|
| id | uuid | PK |
| clinic_id | uuid | FK |
| full_name | varchar(120) | required |
| email | citext | required |
| password_hash | text | required |
| role | enum | required |
| is_active | boolean | default true |
| last_login_at | timestamptz | nullable |
| created_at | timestamptz | required |
| updated_at | timestamptz | required |

Unique/index: `(clinic_id, email)`.

## 5. Table: providers

| Field | Type | Rule |
|---|---|---|
| id | uuid | PK |
| clinic_id | uuid | FK |
| display_name | varchar(120) | required |
| specialty | varchar(120) | nullable |
| user_id | uuid | nullable FK users |
| is_active | boolean | default true |
| created_at | timestamptz | required |
| updated_at | timestamptz | required |

## 6. Table: patients

| Field | Type | Rule |
|---|---|---|
| id | uuid | PK |
| clinic_id | uuid | FK |
| full_name | varchar(150) | required |
| phone_e164 | varchar(20) | required |
| phone_status | enum | default UNKNOWN |
| notes | text | nullable |
| created_by_user_id | uuid | FK |
| created_at | timestamptz | required |
| updated_at | timestamptz | required |
| voided_at | timestamptz | nullable |

Indexes:
- `(clinic_id, phone_e164)`
- `(clinic_id, lower(full_name))`

**[ASSUMPTION]** Phone is a duplicate-detection signal, not a hard unique key, because shared family numbers can exist.

## 7. Table: appointments

| Field | Type | Rule |
|---|---|---|
| id | uuid | PK |
| clinic_id | uuid | FK |
| patient_id | uuid | FK |
| provider_id | uuid | FK |
| scheduled_at | timestamptz | required |
| reason | varchar(300) | required |
| notes | text | nullable |
| status | enum | required |
| latest_outcome | enum | nullable |
| created_by_user_id | uuid | FK |
| updated_by_user_id | uuid | FK |
| rescheduled_from_appointment_id | uuid | nullable self-FK |
| rescheduled_to_appointment_id | uuid | nullable self-FK |
| row_version | bigint | required default 1 |
| created_at | timestamptz | required |
| updated_at | timestamptz | required |
| voided_at | timestamptz | nullable |

Indexes:
- `(clinic_id, scheduled_at)`
- `(clinic_id, status, scheduled_at)`
- `(clinic_id, patient_id, scheduled_at desc)`

## 8. Table: interactions

| Field | Type | Rule |
|---|---|---|
| id | uuid | PK |
| clinic_id | uuid | FK |
| patient_id | uuid | FK |
| appointment_id | uuid | FK |
| performed_by_user_id | uuid | FK |
| type | varchar(30) | default CALL |
| outcome | enum | required |
| note | text | nullable |
| occurred_at | timestamptz | required |
| created_at | timestamptz | required |

Indexes:
- `(appointment_id, occurred_at desc)`
- `(patient_id, occurred_at desc)`
- `(clinic_id, outcome, occurred_at desc)`

## 9. Table: follow_up_tasks

| Field | Type | Rule |
|---|---|---|
| id | uuid | PK |
| clinic_id | uuid | FK |
| appointment_id | uuid | FK |
| patient_id | uuid | FK |
| status | enum | required |
| due_at | timestamptz | nullable |
| retry_after | timestamptz | nullable |
| assigned_to_user_id | uuid | nullable FK |
| completed_by_user_id | uuid | nullable FK |
| completed_at | timestamptz | nullable |
| source_interaction_id | uuid | nullable FK |
| created_at | timestamptz | required |
| updated_at | timestamptz | required |

Rule: one unresolved current task per appointment.

## 10. Table: audit_events

| Field | Type | Rule |
|---|---|---|
| id | uuid | PK |
| clinic_id | uuid | FK |
| actor_user_id | uuid | FK |
| entity_type | varchar(50) | required |
| entity_id | uuid | required |
| action | varchar(50) | required |
| before_json | jsonb | nullable |
| after_json | jsonb | nullable |
| occurred_at | timestamptz | required |
| request_id | uuid | nullable |

## 11. Derived Read Models

### Upcoming
Active appointments ordered by scheduled time.

### Pending
Active appointment + unresolved task + patient + provider + latest interaction.

### Patient Timeline
Normalized projection of:
- appointment creation
- interactions
- reschedules
- material appointment edits

## 12. Validation

### Patient
- name required
- normalized phone required

### Appointment
- patient required
- provider required
- date/time required
- reason required
- cannot attach to voided patient

### Interaction
- outcome required
- **[ASSUMPTION]** `OTHER` requires note

### Reschedule
- new date/time required
- old and new records linked atomically

## 13. Privacy/Security Baseline

**[ASSUMPTION — production legal/compliance review required]**
- Encrypt in transit and at rest.
- Store minimal patient data.
- No call audio.
- Avoid medical-chart detail in notes.
- Maintain audit history.
- Define retention and deletion policy with each clinic/hospital deployment.
