# AUTOMATION_ENGINE.md — Dental Patient Follow-Up

> **Product boundary:** A focused CRM-lite system for **dental clinics and hospitals** that manages patient return appointments and follow-up continuity. It is not a traditional sales CRM, EMR/EHR, or full Hospital Management System (HMS).

> **Primary product reference:** *Patient Follow-Up App MVP Requirements*.

> **UX reference:** Zoho CRM Nextgen is used only for navigation and interaction patterns such as a unified/collapsible sidebar, a main work pane, global search/quick create, and contextual related-record history. Zoho's larger sales CRM feature set is intentionally excluded.

> **Notation:** **[ASSUMPTION]** marks a product/engineering decision introduced because the source requirements do not specify the detail.

## 1. Scope

The MVP needs automated **domain rules**, not a user-configurable CRM automation builder.

```text
Domain Event
→ Validate state
→ Apply rule
→ Persist transaction
→ Write audit event
```

## 2. Internal Events

```text
appointment.created
appointment.updated
appointment.voided
appointment.rescheduled
interaction.recorded
patient.phone_marked_invalid
patient.phone_corrected
followup.created
followup.completed
user.disabled
```

## 3. Rule A01 — Appointment Created

Trigger: `appointment.created`

Actions:
- create pending follow-up task;
- write audit event.

## 4. Rule A02 — Confirmed

Trigger: interaction `CONFIRMED`

Actions:
- appointment → CONFIRMED
- latest_outcome → CONFIRMED
- current task → COMPLETED
- remove from Pending

## 5. Rule A03 — Retry Outcomes

Trigger:
- NO_ANSWER
- BUSY
- DISCONNECTED

Actions:
- keep appointment active
- task → RETRY
- keep Pending

## 6. Rule A04 — Call Back Later

Trigger: `CALL_BACK_LATER`

Actions:
- task → RETRY
- optional `retry_after`
- remain Pending

## 7. Rule A05 — Wants Reschedule

Trigger: `WANTS_RESCHEDULE`

Actions:
- task → RESCHEDULE_REQUIRED
- appointment remains current until replacement is saved

## 8. Rule A06 — Reschedule Saved

Atomic actions:
1. old appointment → SUPERSEDED
2. create replacement appointment
3. link old ↔ new
4. complete old task
5. create pending task for new appointment
6. audit

## 9. Rule A07 — Cancelled

- appointment → CANCELLED
- task → CANCELLED
- remove active queue
- preserve history

## 10. Rule A08 — Wrong Number

- patient phone → INVALID
- task → BLOCKED
- show correction warning

After correction:
- phone status updated
- blocked task → PENDING
- audit correction

## 11. Scheduler

The source does not require automatic reminders.

**[ASSUMPTION]** A lightweight scheduler may:
- surface retry tasks whose `retry_after` is due;
- mark/display overdue follow-up work;
- precompute daily counts if needed.

Do not add WhatsApp/SMS automation to MVP.

## 12. Execution Guarantees

- Idempotent handlers where possible
- Transactional state changes
- Request/event ID for duplicate protection
- Audit event with important changes
- Fail visibly; never show success before persistence

## 13. Future Automation — Out of MVP

- WhatsApp appointment reminders
- SMS reminders
- Auto-escalation after N missed calls
- Configurable retry cadence
- Clinic-specific workflow builder
- AI calling/summarization
- Telephony event ingestion
