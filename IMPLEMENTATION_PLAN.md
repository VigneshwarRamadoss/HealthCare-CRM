# IMPLEMENTATION_PLAN.md — Dental Patient Follow-Up

> **Product boundary:** A focused CRM-lite system for **dental clinics and hospitals** that manages patient return appointments and follow-up continuity. It is not a traditional sales CRM, EMR/EHR, or full Hospital Management System (HMS).

> **Primary product reference:** *Patient Follow-Up App MVP Requirements*.

> **UX reference:** Zoho CRM Nextgen is used only for navigation and interaction patterns such as a unified/collapsible sidebar, a main work pane, global search/quick create, and contextual related-record history. Zoho's larger sales CRM feature set is intentionally excluded.

> **Notation:** **[ASSUMPTION]** marks a product/engineering decision introduced because the source requirements do not specify the detail.

## 1. Delivery Strategy

Build vertical product slices, not “all frontend first / all backend later.” Each phase should end with a usable workflow.

## Phase 0 — Product Lock

### Deliverables
- Approve PRD
- Approve entity model
- Approve workflow/status vocabulary
- Approve RBAC
- Confirm mobile/web tech stack
- Confirm tenant model
- Confirm privacy/retention constraints

### Exit criteria
No contradiction between PRD, entities, workflows, and permissions.

## Phase 1 — Foundation

### Backend
- Project structure
- Database migrations
- Clinic tenant
- Users
- Roles
- Providers
- Auth/session
- Audit framework

### Clients
- Login
- App shell
- Role-aware navigation

### Tests
- Authentication
- Tenant isolation
- RBAC base policies

## Phase 2 — Patient + Appointment Core

### Build
- Patient create/search/edit
- Duplicate warning by phone
- Provider selection
- Appointment CRUD
- Upcoming chronological list
- Today/Tomorrow grouping
- Soft void

### Exit criteria
Receptionist can create a patient return appointment and see it on mobile/web.

## Phase 3 — Follow-Up Queue

### Build
- FollowUpTask generation
- Pending list
- Completed list
- Status chips
- Appointment detail
- Patient timeline projection

### Exit criteria
System clearly tells staff what remains unresolved.

## Phase 4 — Calling Workflow

### Mobile
- Native dialer launch
- Resume-to-outcome prompt
- Outcome sheet

### Web
- Manual landline outcome entry

### Backend
- Interaction endpoint
- Confirmed logic
- Retry logic
- Wrong-number logic
- Audit

### Exit criteria
Staff can Call → Record outcome → see correct next state.

## Phase 5 — Reschedule

### Build
- Wants-reschedule state
- New date/time UI
- Atomic reschedule endpoint
- Old/new appointment linkage
- Timeline events

### Tests
- No history loss
- Double-submit/idempotency
- Concurrent updates

### Exit criteria
Reschedule preserves previous context and creates correct new active work.

## Phase 6 — Doctor/Admin Desktop

### Build
- Overview counters
- Needs Attention list
- Search
- Contextual detail drawer
- User management
- Provider management

### Exit criteria
Doctor/admin can understand clinic follow-up status without staff explanation.

## Phase 7 — Reliability & Security

### Build/Test
- API authorization tests
- Tenant isolation tests
- Optimistic concurrency
- Idempotency
- Rate limiting
- Error handling
- Logging without sensitive data leakage
- DB backups
- Staging deployment

## Phase 8 — Pilot

Run with one controlled dental clinic/hospital department.

Observe:
- time to add appointment
- time to record outcome
- where staff hesitate
- reasons for “Other” outcomes
- retry behavior
- duplicate patient frequency
- shift handover continuity

Do not add major features before observing real workflow usage.

## Phase 9 — MVP Release

### Release checklist
- [ ] Production environment
- [ ] Backup verified
- [ ] Admin account process
- [ ] Staff onboarding
- [ ] Permission matrix verified
- [ ] Audit logging verified
- [ ] Privacy notice/process approved
- [ ] Error tracking enabled
- [ ] Support/escalation path documented

## Phase 10 — Post-MVP Candidates

Prioritize only after pilot data:
- WhatsApp reminder
- SMS reminder
- configurable retry reminders
- calendar sync
- multi-branch clinic support
- richer reporting
- HMS/EMR import
- telephony integration

## Recommended Engineering Work Breakdown

```text
EPIC 1 Auth & Tenant
EPIC 2 Patients
EPIC 3 Providers
EPIC 4 Appointments
EPIC 5 Follow-Up Tasks
EPIC 6 Call Interactions
EPIC 7 Reschedule
EPIC 8 Timeline
EPIC 9 Overview
EPIC 10 Admin/RBAC
EPIC 11 Audit/Security
EPIC 12 Pilot Hardening
```

## Definition of Done per Story

- Functional requirement satisfied
- Server-side permission enforced
- Tenant isolation verified
- Validation errors handled
- Loading/empty/error UI covered
- Audit event added where required
- Unit/integration test added
- Mobile/web behavior consistent where applicable
- No history overwritten incorrectly

## What Not to Build Early

Do not delay MVP for:
- marketing automation
- AI calling
- full analytics
- microservices
- complex workflow builder
- billing/pharmacy/prescription modules
- call recordings
- advanced WhatsApp integration

The MVP succeeds if it solves one loop extremely well:

> **Patient needs to return → staff follows up → outcome is known → next action is visible to everyone who needs it.**
