# Design.md — Dental Patient Follow-Up CRM-lite

> **Product boundary:** A focused CRM-lite system for **dental clinics and hospitals** that manages patient return appointments and follow-up continuity. It is not a traditional sales CRM, EMR/EHR, or full Hospital Management System (HMS).

> **Primary product reference:** *Patient Follow-Up App MVP Requirements*.

> **UX reference:** Zoho CRM Nextgen is used only for navigation and interaction patterns such as a unified/collapsible sidebar, a main work pane, global search/quick create, and contextual related-record history. Zoho's larger sales CRM feature set is intentionally excluded.

> **Notation:** **[ASSUMPTION]** marks a product/engineering decision introduced because the source requirements do not specify the detail.

## 1. Design Objective

Design a clinical operations workspace that feels **fast, calm, and obvious**. A nurse/receptionist should understand what needs attention without CRM training.

The design should combine:
- caller-app simplicity on mobile;
- lightweight CRM record context on desktop;
- healthcare-grade clarity without pretending to be an EMR/HMS.

## 2. Zoho Nextgen Patterns to Adapt

Use these patterns from the Zoho CRM Nextgen navigation reference:

1. **Unified sidebar** for primary navigation.
2. **Main work pane** that changes based on the selected section.
3. **Collapsible sidebar** to maximize working space.
4. **Global search** at the top.
5. **Single + quick-create action** available across the workspace.
6. **Related-record/history access** from the current record rather than forcing deep navigation.

### Do not copy
- Teamspaces
- Leads/deals/accounts
- Marketplace
- Large analytics/report builders
- Marketing modules
- Generic module configuration
- Sales utilities

The reference provides an interaction grammar, not the product scope.

## 3. Core UX Question

Every screen should answer:

1. What needs attention now?
2. Which patient is this?
3. When should the patient return?
4. What happened last time we contacted them?
5. What should I do next?

## 4. Desktop Shell

```text
┌────────────────┬──────────────────────────────────────────────┐
│ CLINIC NAME    │ Search patients...              [+ Add]     │
│                ├──────────────────────────────────────────────┤
│ Overview       │                                              │
│ Appointments   │              MAIN WORK PANE                  │
│ Pending        │                                              │
│ Completed      │                                              │
│                │                                              │
│─────────────── │                                              │
│ Settings*      │                                              │
│ Profile        │                                              │
└────────────────┴──────────────────────────────────────────────┘
* Admin only
```

### Sidebar behavior
- Persistent on desktop
- Collapsible
- Selected item clearly highlighted
- Keep only 4–5 core destinations
- Settings separated from daily work

## 5. Doctor/Admin Overview

The dashboard is operational, not analytical decoration.

```text
Tomorrow's Return Patients                       12

[ 8 Confirmed ] [ 2 Retry ] [ 1 Reschedule ] [ 1 Not Contacted ]

Needs Attention
---------------------------------------------------------------
11:30  Arun Kumar       Root canal review    No answer     [Open]
02:00  Divya M          Extraction review    Not contacted [Open]
04:15  Priya S          Crown fitting         Reschedule    [Open]
```

### Dashboard priorities
- Today's/tomorrow's appointments
- Pending work
- Status counts
- Items needing attention

Avoid vanity graphs in MVP.

## 6. Desktop Appointments List

Recommended columns:
- Date/time
- Patient
- Doctor/Dentist
- Reason
- Latest status
- Last contacted by
- Next action

```text
Time    Patient        Doctor      Reason               Status        Action
10:30   Priya          Dr Kumar    Implant review       Confirmed     Open
11:45   Arun           Dr Kumar    Root canal review    No answer     Retry
16:00   Mohammed       Dr Ravi     Extraction review    Not contacted Call
```

The action should be more visible than metadata.

## 7. Contextual Patient/Appointment Panel

Use a right-side drawer or dedicated detail page depending on screen width.

```text
┌────────────────────────────────┐
│ Arun Kumar                  ×  │
│ +91 98XXXXXXXX                 │
│                                │
│ NEXT RETURN                    │
│ 21 Aug 2026 · 3:00 PM          │
│ Dr Kumar                       │
│ Root canal review              │
│                                │
│ [ Call ] [ Edit ]              │
│                                │
│ FOLLOW-UP HISTORY              │
│ 18 Aug · 4:16 PM               │
│ Nurse Priya                    │
│ Wants to reschedule            │
│ “Friday afternoon preferred”   │
│                                │
│ 18 Aug · 10:34 AM              │
│ Nurse Anu                      │
│ Did not pick up                │
└────────────────────────────────┘
```

## 8. Mobile Shell

```text
┌──────────────────────────────┐
│ Clinic Name          Search  │
│                              │
│ Upcoming | Pending | Done    │
├──────────────────────────────┤
│ TODAY                        │
│                              │
│ 10:30 AM                     │
│ Priya S                      │
│ Implant review               │
│ Dr Kumar                     │
│ [Not contacted]      [CALL]  │
│                              │
│ 11:45 AM                     │
│ Arun Kumar                   │
│ Root canal review            │
│ [No answer]          [CALL]  │
│                              │
│                    [+ Add]   │
└──────────────────────────────┘
```

### Mobile navigation
Bottom navigation:
- Upcoming
- Pending
- Completed

`+ Add Appointment` stays a floating/header action rather than becoming another heavy module.

## 9. Appointment Card Hierarchy

### Primary
- Time/date
- Patient name
- Current follow-up status
- Call action

### Secondary
- Return reason
- Dentist/doctor

### On open
- Phone
- Notes
- Full interaction history

## 10. Call UX

### Before call

```text
Arun Kumar
Tomorrow · 11:30 AM
Root canal review · Dr Kumar

+91 98XXXXXXXX

[ Call Patient ]
```

### After returning to app

```text
What happened?

[ Confirmed ]
[ Did not pick up ]
[ Busy ]
[ Call back later ]
[ Wants to reschedule ]
[ Cancelled ]
[ Wrong number ]
[ Other ]
```

Target: one or two taps to record a normal outcome.

## 11. Reschedule UX

```text
Reschedule Arun Kumar

New date    [ 21 Aug 2026 ]
New time    [ 03:00 PM    ]

Note (optional)
[ Patient requested afternoon ]

[ Save new appointment ]
```

After save, show:
- new appointment confirmation;
- old appointment marked as rescheduled in history.

## 12. Status Vocabulary

| Internal | UI label | Queue effect |
|---|---|---|
| NOT_CONTACTED | Not contacted | Pending |
| CONFIRMED | Confirmed | Resolved |
| NO_ANSWER | No answer | Pending retry |
| BUSY | Busy | Pending retry |
| DISCONNECTED | Disconnected | Pending retry |
| CALL_LATER | Call later | Pending retry |
| RESCHEDULE_REQUIRED | Reschedule | Pending |
| CANCELLED | Cancelled | Resolved |
| WRONG_NUMBER | Wrong number | Blocked/pending correction |

Use icon + text; never color alone.

## 13. Search & Quick Create

### Global search
MVP search:
- Patient name
- Phone number

### + Add
One global quick-create action:
- Add Appointment

Do not expose a generic CRM multi-entity creation menu.

## 14. Empty/Error States

### No upcoming appointments
> No upcoming return appointments.

Action: `+ Add Appointment`

### No pending follow-ups
> All patient follow-ups are up to date.

### Save failed
> Couldn’t save this update. Check your connection and try again.

Keep entered form data until retry/cancel.

### Possible duplicate patient
> A patient with this phone number already exists.

Actions:
- Use existing
- Review patient
- Create separately (restricted/explicit)

## 15. Accessibility

- 44×44px minimum touch targets
- Keyboard-operable desktop actions
- Clear focus states
- High contrast
- No status conveyed by color alone
- Text labels for icons
- Inline form errors
- Destructive-action confirmation
- Responsive text scaling

## 16. Responsive Model

- Mobile: card-first, one-column
- Tablet: list + detail where space allows
- Desktop: collapsible sidebar + main list + optional right detail drawer

## 17. Visual Direction

**[ASSUMPTION]** No brand system was supplied.

Recommended:
- clean clinical neutrals;
- restrained single accent color;
- high legibility;
- 8pt spacing system;
- rounded but professional cards;
- minimal shadows;
- calm status chips;
- avoid dense sales-CRM chrome.

## 18. Design Acceptance Checklist

- [ ] First-time staff can identify pending work without training.
- [ ] Call is the dominant action for patients requiring contact.
- [ ] Outcome is recordable within one or two taps after a call.
- [ ] Failed calls remain clearly pending.
- [ ] Reschedule preserves old history.
- [ ] Doctor/admin understands tomorrow's status in one screen.
- [ ] Staff attribution is visible in timeline.
- [ ] Desktop feels CRM-familiar without looking like a sales CRM.
- [ ] Mobile and desktop use identical status terminology.
