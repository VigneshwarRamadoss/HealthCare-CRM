# Clinical CRM - Dental Clinic & Hospital Patient Follow-Up System

A comprehensive, modular monolith CRM system designed specifically for dental clinics and hospitals. The system focuses on ensuring no patient "falls through the cracks" by streamlining the patient journey, automating follow-up tracking, managing appointments, and providing role-based access for different clinic staff.

## 🌟 Key Features

- **Role-Based Access Control (RBAC):** Distinct interfaces and permissions for Admins, Managers, Providers (Doctors), and Front Desk staff.
- **Patient Journey Tracking:** Visual timeline of a patient's interactions, appointments, and treatment statuses.
- **Automated Follow-Up Queue:** A centralized task queue for front desk staff to manage outbound calls, confirmations, and reschedules efficiently.
- **Atomic Operations:** Critical workflows (like rescheduling an appointment while closing a follow-up task) are handled within database transactions to ensure data consistency.
- **Clinical Design System:** A clean, professional, and accessible user interface built with React and Tailwind CSS principles (implemented via robust custom CSS).

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, TypeScript, React Router, Context API for state management.
- **Backend:** Node.js, Express.js (Modular Monolith Architecture).
- **Database:** SQLite (using `sqlite3` driver) for a lightweight, zero-configuration persistence layer.

## 🏗️ Architecture

The application is built as a **Modular Monolith**. 
- The frontend is a Single Page Application (SPA) communicating via RESTful JSON APIs.
- The backend API is decoupled logically by domain (Auth, Patients, Appointments, Follow-ups, Interactions) while running within a single Node.js process.
- Concurrency and data integrity are handled via optimistic locking (using `row_version` fields) and manual transaction management for atomic route operations.

### Directory Structure

```text
/
├── server/               # Node.js Express Backend
│   ├── index.js          # API Server entry point & Express configuration
│   ├── db.js             # SQLite database connection, schema generation, and seeding
│   ├── middleware/       # Custom Express middlewares (e.g., Auth & RBAC)
│   └── routes/           # Domain-specific route controllers (patients, appointments, etc.)
├── src/                  # React Frontend
│   ├── api/              # Centralized Axios API client
│   ├── components/       # Reusable React components (Dashboard, PatientTimeline, etc.)
│   ├── context/          # React Context (AuthContext)
│   ├── types.ts          # TypeScript interfaces matching DB schemas
│   ├── main.tsx          # React application mount point
│   └── App.tsx           # Application routing and layout wrapper
├── index.html            # Vite entry HTML
├── vite.config.ts        # Vite configuration (includes API proxying)
└── *.md                  # Extensive architectural and PRD documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/VigneshwarRamadoss/HealthCare-CRM.git
   cd HealthCare-CRM
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Running Locally

The project is configured to run the frontend and backend concurrently in development mode.

1. **Start the Development Servers:**
   ```bash
   npm run dev
   ```
   *(Alternatively, run `npm run server` to start only the backend API, and `npm run build` then `npm start` for production preview).*

2. **Access the Application:**
   - Frontend SPA: [http://localhost:3000](http://localhost:3000)
   - Backend API: [http://localhost:5000](http://localhost:5000)

*Note: The SQLite database (`clinic_crm.db`) is automatically generated and seeded with test data upon the first backend startup.*

## 🔐 Roles & Test Accounts

The system is seeded with test users across all RBAC tiers. **Password for all test accounts is `password`.**

| Role | Email | Capabilities |
| :--- | :--- | :--- |
| **Admin** | `admin@clinic.com` | Full system access, staff management, system configuration. |
| **Manager** | `sarah.manager@clinic.com` | Oversee clinic metrics, view all staff queues, generate reports. |
| **Provider** | `dr.smith@clinic.com` | View patient medical timelines, update treatment notes, mark follow-ups. |
| **Front Desk** | `jane.frontdesk@clinic.com` | Manage the follow-up call queue, schedule/reschedule appointments, log interactions. |

## 📚 Detailed Documentation

For an in-depth understanding of the system's design decisions and requirements, please refer to the markdown files included in the repository root:
- `SYSTEM_ARCHITECTURE.md`: High-level system design.
- `DATA_MODEL.md`: Database schemas and relationships.
- `RBAC.md`: Complete Role-Based Access Control matrix.
- `API_SPEC.md`: REST API contract definitions.
- `CRM_WORKFLOWS.md`: Core system workflows (e.g., patient no-show handling).
