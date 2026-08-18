# API_SPEC.md — Dental Patient Follow-Up

> **Product boundary:** A focused CRM-lite system for **dental clinics and hospitals** that manages patient return appointments and follow-up continuity. It is not a traditional sales CRM, EMR/EHR, or full Hospital Management System (HMS).

> **Primary product reference:** *Patient Follow-Up App MVP Requirements*.

> **UX reference:** Zoho CRM Nextgen is used only for navigation and interaction patterns such as a unified/collapsible sidebar, a main work pane, global search/quick create, and contextual related-record history. Zoho's larger sales CRM feature set is intentionally excluded.

> **Notation:** **[ASSUMPTION]** marks a product/engineering decision introduced because the source requirements do not specify the detail.

## 1. API Conventions

**[ASSUMPTION]**
- REST JSON
- `/api/v1`
- TLS only
- UUID IDs
- JWT access + refresh
- Tenant derived from authenticated user
- ISO-8601 timestamps

## 2. Response Shapes

Success:
```json
{"data": {}, "meta": {}}
```

Error:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "New appointment time is required.",
    "fields": {"scheduled_at": "Required"}
  },
  "request_id": "uuid"
}
```

## 3. Auth

### POST `/auth/login`
### POST `/auth/refresh`
### POST `/auth/logout`
### GET `/me`

## 4. Patients

### GET `/patients`
Query:
- `search`
- `phone`
- `limit`
- `cursor`

### POST `/patients`
```json
{
  "full_name": "Arun Kumar",
  "phone": "+9198XXXXXXXX",
  "notes": null
}
```

### GET `/patients/:patientId`
### PATCH `/patients/:patientId`
### GET `/patients/:patientId/timeline`

## 5. Providers

### GET `/providers`
### POST `/providers` — Admin
### PATCH `/providers/:providerId` — Admin

## 6. Appointments

### GET `/appointments`
Filters:
- from/to
- status
- provider_id
- cursor

### POST `/appointments`
```json
{
  "patient_id": "uuid",
  "provider_id": "uuid",
  "scheduled_at": "2026-08-24T11:30:00+05:30",
  "reason": "Root canal review",
  "notes": null
}
```

### GET `/appointments/:appointmentId`
Return appointment + patient + provider + current task + recent interactions.

### PATCH `/appointments/:appointmentId`
Use optimistic concurrency:
```json
{
  "scheduled_at": "2026-08-24T12:00:00+05:30",
  "reason": "Root canal review",
  "row_version": 7
}
```

Stale version → `409 CONFLICT`.

### DELETE `/appointments/:appointmentId`
Logical void.

## 7. Follow-Ups

### GET `/follow-ups/pending`
Filters:
- due
- outcome
- provider_id
- cursor

### GET `/follow-ups/completed`

### PATCH `/follow-ups/:taskId`
Limited fields such as retry time/optional assignment.

## 8. Interactions

### POST `/appointments/:appointmentId/interactions`
```json
{
  "outcome": "NO_ANSWER",
  "note": null,
  "occurred_at": "2026-08-18T10:34:00+05:30"
}
```

Server determines actor and applies domain rules.

### GET `/appointments/:appointmentId/interactions`

## 9. Reschedule Domain Endpoint

### POST `/appointments/:appointmentId/reschedule`
```json
{
  "scheduled_at": "2026-08-21T15:00:00+05:30",
  "note": "Patient requested Friday afternoon"
}
```

Server atomically:
- records/ensures reschedule outcome;
- supersedes old appointment;
- creates replacement;
- links records;
- updates tasks.

## 10. Overview

### GET `/overview`
```json
{
  "data": {
    "date": "2026-08-19",
    "appointments": 12,
    "confirmed": 8,
    "retry": 2,
    "reschedule_required": 1,
    "not_contacted": 1,
    "needs_attention": []
  }
}
```

## 11. Admin

### GET `/admin/users`
### POST `/admin/users`
### PATCH `/admin/users/:userId`
### POST `/admin/users/:userId/disable`

## 12. HTTP Codes

- 200 success
- 201 created
- 204 void/no body
- 400 malformed
- 401 unauthenticated
- 403 unauthorized
- 404 not found/not visible
- 409 state/version conflict
- 422 semantic validation
- 429 rate-limited

## 13. Idempotency

Use `Idempotency-Key` on:
- create appointment
- record interaction
- reschedule

This prevents duplicate records on network retries.

## 14. No MVP API For

- leads/deals
- campaigns
- invoices
- prescription data
- billing
- call recordings
- AI workflows
- custom CRM modules
