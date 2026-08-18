# INTEGRATIONS.md — Dental Patient Follow-Up

> **Product boundary:** A focused CRM-lite system for **dental clinics and hospitals** that manages patient return appointments and follow-up continuity. It is not a traditional sales CRM, EMR/EHR, or full Hospital Management System (HMS).

> **Primary product reference:** *Patient Follow-Up App MVP Requirements*.

> **UX reference:** Zoho CRM Nextgen is used only for navigation and interaction patterns such as a unified/collapsible sidebar, a main work pane, global search/quick create, and contextual related-record history. Zoho's larger sales CRM feature set is intentionally excluded.

> **Notation:** **[ASSUMPTION]** marks a product/engineering decision introduced because the source requirements do not specify the detail.

## 1. Principle

The core product must work without external communication or hospital systems.

## 2. MVP Integration — Mobile Dialer

### Purpose
Tap `Call Patient` from the app.

### Flow
```text
Patient Follow-Up App
→ tel: URI / native dialer intent
→ phone app
→ staff makes call
→ returns to app
→ outcome sheet
```

### Outbound data
- phone number

### Required inbound data
- none

### Privacy
- no call audio
- no call transcription
- no telephony metadata required

### Limitation
Native dialer launch does not guarantee reliable call completion callbacks on all platforms. Do not build MVP logic that assumes it does.

## 3. Desktop / Landline

Not a technical integration:

```text
Browser shows phone
→ receptionist calls from landline
→ records outcome manually
```

## 4. Authentication

**[ASSUMPTION]** Internal email/password initially.

Future candidates:
- Google Workspace SSO
- Microsoft Entra ID
- OTP

## 5. Future WhatsApp

Not MVP.

Possible later capabilities:
- appointment reminder
- confirmation
- reschedule link

Requires:
- patient consent policy
- approved templates
- provider/API credentials
- delivery status handling
- retries/failure handling

## 6. Future SMS

Same possible reminder use case as WhatsApp.

## 7. Future Calendar

Possible sync with:
- Google Calendar
- Microsoft Outlook Calendar

Important: the follow-up system must remain the source of truth for follow-up status unless product scope changes.

## 8. Future HMS/EMR Integration

Possible use cases:
- import patient identity
- import return appointment
- export follow-up status

Must define:
- system of record
- patient identifier mapping
- data minimization
- authorization
- error/reconciliation process

## 9. Future Telephony

Possible providers can support:
- click-to-call
- call event status
- agent queues

Explicitly post-MVP because the source requirement says sophisticated telephony is unnecessary initially.

## 10. Integration Failure Principle

External integration failure must not corrupt core patient follow-up state.

Use:
- retries
- idempotency
- failure logs
- manual fallback
