# RBAC.md — Dental Patient Follow-Up

> **Product boundary:** A focused CRM-lite system for **dental clinics and hospitals** that manages patient return appointments and follow-up continuity. It is not a traditional sales CRM, EMR/EHR, or full Hospital Management System (HMS).

> **Primary product reference:** *Patient Follow-Up App MVP Requirements*.

> **UX reference:** Zoho CRM Nextgen is used only for navigation and interaction patterns such as a unified/collapsible sidebar, a main work pane, global search/quick create, and contextual related-record history. Zoho's larger sales CRM feature set is intentionally excluded.

> **Notation:** **[ASSUMPTION]** marks a product/engineering decision introduced because the source requirements do not specify the detail.

## 1. Roles

- NURSE
- RECEPTIONIST
- DOCTOR
- ADMIN

## 2. Permission Matrix

Legend: ✅ allowed, 👁 read-only, ⚠ conditional, ❌ denied

| Capability | Nurse | Receptionist | Doctor | Admin |
|---|---:|---:|---:|---:|
| View upcoming | ✅ | ✅ | ✅ | ✅ |
| View pending | ✅ | ✅ | ✅ | ✅ |
| View completed/history | ✅ | ✅ | ✅ | ✅ |
| Search patient | ✅ | ✅ | ✅ | ✅ |
| View timeline | ✅ | ✅ | ✅ | ✅ |
| Add patient | ✅ | ✅ | ⚠ | ✅ |
| Edit basic contact | ✅ | ✅ | ⚠ | ✅ |
| Add appointment | ✅ | ✅ | ✅ | ✅ |
| Edit appointment | ✅ | ✅ | ⚠ | ✅ |
| Initiate mobile call | ✅ | ✅ | ⚠ | ✅ |
| Record outcome | ✅ | ✅ | ⚠ | ✅ |
| Reschedule | ✅ | ✅ | ⚠ | ✅ |
| Add short note | ✅ | ✅ | ⚠ | ✅ |
| Void incorrect appointment | ⚠ | ⚠ | ❌ | ✅ |
| Correct historical interaction | ❌ | ❌ | ❌ | ✅* |
| Manage providers | ❌ | ⚠ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ✅ |
| Change roles | ❌ | ❌ | ❌ | ✅ |
| View full audit log | ❌ | ❌ | ❌ | ✅ |

`*` Correction must preserve the original audit evidence.

## 3. Conditional Delete/Void

**[ASSUMPTION]** Nurse/receptionist may void an appointment only if:
- they created it; and
- no interaction has been recorded.

After real follow-up activity exists, admin intervention is required.

## 4. Doctor Write Scope

The product reference emphasizes doctor visibility.

**[ASSUMPTION]** Doctors may create appointments and optionally correct schedule details, but routine call follow-up is nurse/receptionist-first.

## 5. Tenant Isolation

Never trust client-provided `clinic_id` for authorization.

Server query pattern:

```text
entity.id = requested_id
AND entity.clinic_id = authenticated_user.clinic_id
```

## 6. Permission Names

```text
patient.read
patient.create
patient.update_contact
appointment.read
appointment.create
appointment.update
appointment.void
interaction.read
interaction.create
interaction.correct
followup.read
followup.resolve
provider.read
provider.manage
user.read
user.manage
audit.read
```

## 7. Security Principle

> Hidden buttons improve UX. Server-side authorization provides security.
