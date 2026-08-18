# BUSINESS_REQUIREMENTS.md — Dental Clinic & Hospital Follow-Up

> **Product boundary:** A focused CRM-lite system for **dental clinics and hospitals** that manages patient return appointments and follow-up continuity. It is not a traditional sales CRM, EMR/EHR, or full Hospital Management System (HMS).

> **Primary product reference:** *Patient Follow-Up App MVP Requirements*.

> **UX reference:** Zoho CRM Nextgen is used only for navigation and interaction patterns such as a unified/collapsible sidebar, a main work pane, global search/quick create, and contextual related-record history. Zoho's larger sales CRM feature set is intentionally excluded.

> **Notation:** **[ASSUMPTION]** marks a product/engineering decision introduced because the source requirements do not specify the detail.

## 1. Business Objective

Give dental clinics and hospitals a reliable shared process for **return-visit follow-up**, especially after a dentist/doctor asks a patient to come back for review, continuation of treatment, or post-procedure assessment.

## 2. Operational Pain Points

- Follow-up date exists only in conversation or paper.
- Staff forget to call.
- Patients do not answer and disappear from the workflow.
- Different shifts do not know what the previous shift did.
- Reception has one status while the dentist assumes another.
- Reschedules are not tracked as a history.
- Landline-based clinics have no structured place to record call outcomes.

## 3. Desired Business Outcomes

1. Every planned return visit has a digital record.
2. Every follow-up attempt has an outcome.
3. Failed contact remains visible until resolved.
4. Rescheduling preserves continuity.
5. Doctor/admin can see current status without asking staff.
6. Shift handover happens through the system.
7. Staff activity is attributable.

## 4. Business Actors

- Dentist / Doctor
- Nurse / Dental Assistant
- Receptionist / Front Desk
- Clinic/Hospital Administrator

## 5. Business Process

```text
Consultation / Procedure
        ↓
Doctor gives return date
        ↓
Staff records patient + appointment
        ↓
Appointment appears in follow-up queue
        ↓
Staff contacts patient
        ↓
Outcome recorded
        ↓
Confirmed / Retry / Reschedule / Cancel
        ↓
Doctor + next shift see the same state
```

## 6. Business Rules

### BR-01 Shared Clinic State
Authorized staff within the same clinic/hospital tenant see the same current status.

### BR-02 Every Interaction Is Attributed
Store staff user and timestamp for each call outcome and material update.

### BR-03 Failed Call Is Not Completion
No answer, busy, disconnected, or call-later remains pending.

### BR-04 Reschedule Is Historical
The previous appointment cannot simply be overwritten after a real follow-up interaction. Preserve it and link the replacement.

### BR-05 Cancellation Is Historical
Cancelled return visits leave active queues but remain visible in history.

### BR-06 Wrong Number Is Blocked Work
Wrong-number status must stop blind repeated calls and require contact correction.

### BR-07 Handover Is Automatic
No special “handover complete” step is required for the core workflow; the shared queue is the handover.

### BR-08 Minimal Patient Data
Collect only patient identity/contact details and follow-up context necessary for this product.

### BR-09 Manual Landline Calls Are Valid
Desktop users can manually call and record the same structured response.

### BR-10 Patient History Must Be Append-Oriented
New real-world events add to history rather than rewriting old events.

## 7. Dental/Hospital Follow-Up Reasons

The product should support free text and later may add templates such as:
- Post-extraction review
- RCT follow-up
- Crown/bridge fitting or review
- Implant review
- Orthodontic adjustment
- Post-surgical review
- Periodontal follow-up
- Scaling review
- Denture fitting/review
- General treatment review

These are examples, not clinical diagnosis fields.

## 8. Business Reporting

MVP operational metrics only:
- due today/tomorrow
- confirmed
- not contacted
- no answer/retry
- reschedule required
- cancelled
- pending total

## 9. Organization/Tenant Assumptions

**[ASSUMPTION]**
- One deployment can serve multiple clinic/hospital organizations.
- Data is tenant isolated.
- A clinic can contain multiple doctors/dentists.
- A doctor may be represented as a provider even without a login.
- Time zone is configured at clinic level.

## 10. Out of Business Scope for MVP

- Clinical record keeping
- Patient diagnosis history
- Billing/payment
- Insurance
- Lab workflow
- Pharmacy
- Inventory
- Prescription
- Treatment plan engine
- Sales/lead management
- Marketing campaigns
