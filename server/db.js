import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../clinic_crm.db');

const db = new sqlite3.Database(dbPath);

// Helper function to run SQL queries as Promises
export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const getOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// Initialize schema and seed data
export async function initDb() {
  await run(`PRAGMA foreign_keys = ON;`);

  // Clinics
  await run(`
    CREATE TABLE IF NOT EXISTS clinics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Users
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('NURSE', 'RECEPTIONIST', 'DOCTOR', 'ADMIN')),
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id)
    );
  `);

  // Providers
  await run(`
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      specialty TEXT,
      user_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Patients
  await run(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone_e164 TEXT NOT NULL,
      phone_status TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(phone_status IN ('UNKNOWN', 'VALID', 'INVALID')),
      notes TEXT,
      created_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      voided_at TEXT,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id),
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );
  `);

  // Appointments
  await run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      reason TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL CHECK(status IN ('SCHEDULED', 'CONFIRMED', 'CANCELLED', 'SUPERSEDED', 'COMPLETED', 'VOIDED')),
      latest_outcome TEXT,
      created_by_user_id TEXT NOT NULL,
      updated_by_user_id TEXT NOT NULL,
      rescheduled_from_appointment_id TEXT,
      rescheduled_to_appointment_id TEXT,
      row_version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      voided_at TEXT,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (provider_id) REFERENCES providers(id),
      FOREIGN KEY (created_by_user_id) REFERENCES users(id),
      FOREIGN KEY (updated_by_user_id) REFERENCES users(id)
    );
  `);

  // Interactions
  await run(`
    CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      appointment_id TEXT NOT NULL,
      performed_by_user_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'CALL',
      outcome TEXT NOT NULL CHECK(outcome IN ('CONFIRMED', 'NO_ANSWER', 'BUSY', 'DISCONNECTED', 'CALL_BACK_LATER', 'WANTS_RESCHEDULE', 'CANCELLED', 'WRONG_NUMBER', 'OTHER')),
      note TEXT,
      occurred_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id),
      FOREIGN KEY (performed_by_user_id) REFERENCES users(id)
    );
  `);

  // Follow-Up Tasks
  await run(`
    CREATE TABLE IF NOT EXISTS follow_up_tasks (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL,
      appointment_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'RETRY', 'RESCHEDULE_REQUIRED', 'COMPLETED', 'CANCELLED', 'BLOCKED')),
      due_at TEXT,
      retry_after TEXT,
      assigned_to_user_id TEXT,
      completed_by_user_id TEXT,
      completed_at TEXT,
      source_interaction_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (assigned_to_user_id) REFERENCES users(id),
      FOREIGN KEY (completed_by_user_id) REFERENCES users(id),
      FOREIGN KEY (source_interaction_id) REFERENCES interactions(id)
    );
  `);

  // Audit Events
  await run(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL,
      actor_user_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      before_json TEXT,
      after_json TEXT,
      occurred_at TEXT NOT NULL,
      request_id TEXT,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id),
      FOREIGN KEY (actor_user_id) REFERENCES users(id)
    );
  `);

  await seedData();
}

async function seedData() {
  const existingClinic = await getOne(`SELECT id FROM clinics LIMIT 1;`);
  if (existingClinic) return; // already seeded

  console.log('Seeding initial data...');
  const now = new Date().toISOString();
  const clinicId = crypto.randomUUID();

  await run(`
    INSERT INTO clinics (id, name, timezone, is_active, created_at, updated_at)
    VALUES (?, ?, ?, 1, ?, ?);
  `, [clinicId, 'Apex Dental Care & Implant Center', 'Asia/Kolkata', now, now]);

  // Hashed Passwords
  const adminPass = await bcrypt.hash('admin123', 10);
  const docPass = await bcrypt.hash('doc123', 10);
  const nursePass = await bcrypt.hash('nurse123', 10);
  const recPass = await bcrypt.hash('rec123', 10);

  // Users
  const adminId = crypto.randomUUID();
  const docSmithUserId = crypto.randomUUID();
  const docPatelUserId = crypto.randomUUID();
  const nurseId = crypto.randomUUID();
  const recId = crypto.randomUUID();

  await run(`INSERT INTO users VALUES (?, ?, ?, ?, ?, 'ADMIN', 1, NULL, ?, ?);`, [adminId, clinicId, 'System Admin', 'admin@apexdental.com', adminPass, now, now]);
  await run(`INSERT INTO users VALUES (?, ?, ?, ?, ?, 'DOCTOR', 1, NULL, ?, ?);`, [docSmithUserId, clinicId, 'Dr. Sarah Smith', 'dr.smith@apexdental.com', docPass, now, now]);
  await run(`INSERT INTO users VALUES (?, ?, ?, ?, ?, 'DOCTOR', 1, NULL, ?, ?);`, [docPatelUserId, clinicId, 'Dr. Rajesh Patel', 'dr.patel@apexdental.com', docPass, now, now]);
  await run(`INSERT INTO users VALUES (?, ?, ?, ?, ?, 'NURSE', 1, NULL, ?, ?);`, [nurseId, clinicId, 'Nurse Priya Sharma', 'nurse.priya@apexdental.com', nursePass, now, now]);
  await run(`INSERT INTO users VALUES (?, ?, ?, ?, ?, 'RECEPTIONIST', 1, NULL, ?, ?);`, [recId, clinicId, 'Anita Roy (Front Desk)', 'reception.anita@apexdental.com', recPass, now, now]);

  // Providers
  const provSmithId = crypto.randomUUID();
  const provPatelId = crypto.randomUUID();
  await run(`INSERT INTO providers VALUES (?, ?, ?, 'Endodontics & RCT Specialist', ?, 1, ?, ?);`, [provSmithId, clinicId, 'Dr. Sarah Smith', docSmithUserId, now, now]);
  await run(`INSERT INTO providers VALUES (?, ?, ?, 'Oral Surgery & Implants', ?, 1, ?, ?);`, [provPatelId, clinicId, 'Dr. Rajesh Patel', docPatelUserId, now, now]);

  // Patients
  const p1Id = crypto.randomUUID();
  const p2Id = crypto.randomUUID();
  const p3Id = crypto.randomUUID();
  const p4Id = crypto.randomUUID();
  const p5Id = crypto.randomUUID();

  await run(`INSERT INTO patients VALUES (?, ?, 'Arun Kumar', '+919876543210', 'VALID', 'Sensitive upper molar', ?, ?, ?, NULL);`, [p1Id, clinicId, recId, now, now]);
  await run(`INSERT INTO patients VALUES (?, ?, 'Sunita Verma', '+919812345678', 'VALID', 'Post implant placement care', ?, ?, ?, NULL);`, [p2Id, clinicId, recId, now, now]);
  await run(`INSERT INTO patients VALUES (?, ?, 'Rahul Mehra', '+919899887766', 'VALID', 'Orthodontic wire check', ?, ?, ?, NULL);`, [p3Id, clinicId, recId, now, now]);
  await run(`INSERT INTO patients VALUES (?, ?, 'Kavita Reddy', '+919711223344', 'VALID', 'Crown fitting review', ?, ?, ?, NULL);`, [p4Id, clinicId, recId, now, now]);
  await run(`INSERT INTO patients VALUES (?, ?, 'Vikram Singh', '+919833445566', 'INVALID', 'Incorrect phone provided earlier', ?, ?, ?, NULL);`, [p5Id, clinicId, recId, now, now]);

  // Dates for appointments
  const todayDate = new Date();
  todayDate.setHours(11, 30, 0, 0);
  const todayIso = todayDate.toISOString();

  const todayLater = new Date();
  todayLater.setHours(16, 0, 0, 0);
  const todayLaterIso = todayLater.toISOString();

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  tomorrowDate.setHours(10, 0, 0, 0);
  const tomorrowIso = tomorrowDate.toISOString();

  const overdueDate = new Date();
  overdueDate.setDate(overdueDate.getDate() - 1);
  overdueDate.setHours(14, 0, 0, 0);
  const overdueIso = overdueDate.toISOString();

  // Appointments
  const apt1Id = crypto.randomUUID();
  const apt2Id = crypto.randomUUID();
  const apt3Id = crypto.randomUUID();
  const apt4Id = crypto.randomUUID();
  const apt5Id = crypto.randomUUID();

  await run(`INSERT INTO appointments VALUES (?, ?, ?, ?, ?, 'Root Canal Stage 2 Review', 'Check healing and cap preparation', 'SCHEDULED', NULL, ?, ?, NULL, NULL, 1, ?, ?, NULL);`, [apt1Id, clinicId, p1Id, provSmithId, todayIso, recId, recId, now, now]);
  await run(`INSERT INTO appointments VALUES (?, ?, ?, ?, ?, 'Post-Extraction Review', 'Check socket healing after molar extraction', 'SCHEDULED', 'NO_ANSWER', ?, ?, NULL, NULL, 1, ?, ?, NULL);`, [apt2Id, clinicId, p2Id, provPatelId, todayLaterIso, recId, recId, now, now]);
  await run(`INSERT INTO appointments VALUES (?, ?, ?, ?, ?, 'Crown Fitting Review', 'Verify occlusion & shade', 'CONFIRMED', 'CONFIRMED', ?, ?, NULL, NULL, 1, ?, ?, NULL);`, [apt3Id, clinicId, p3Id, provSmithId, tomorrowIso, recId, recId, now, now]);
  await run(`INSERT INTO appointments VALUES (?, ?, ?, ?, ?, 'Implant Placement Follow-up', 'Suture removal & tissue check', 'SCHEDULED', 'CALL_BACK_LATER', ?, ?, NULL, NULL, 1, ?, ?, NULL);`, [apt4Id, clinicId, p4Id, provPatelId, overdueIso, recId, recId, now, now]);
  await run(`INSERT INTO appointments VALUES (?, ?, ?, ?, ?, 'Orthodontic Adjustment', 'Wire tightening', 'SCHEDULED', 'WRONG_NUMBER', ?, ?, NULL, NULL, 1, ?, ?, NULL);`, [apt5Id, clinicId, p5Id, provSmithId, todayIso, recId, recId, now, now]);

  // Tasks
  await run(`INSERT INTO follow_up_tasks VALUES (?, ?, ?, ?, 'PENDING', ?, NULL, NULL, NULL, NULL, NULL, ?, ?);`, [crypto.randomUUID(), clinicId, apt1Id, p1Id, todayIso, now, now]);
  await run(`INSERT INTO follow_up_tasks VALUES (?, ?, ?, ?, 'RETRY', ?, ?, NULL, NULL, NULL, NULL, ?, ?);`, [crypto.randomUUID(), clinicId, apt2Id, p2Id, todayLaterIso, todayLaterIso, now, now]);
  await run(`INSERT INTO follow_up_tasks VALUES (?, ?, ?, ?, 'COMPLETED', ?, NULL, NULL, ?, ?, NULL, ?, ?);`, [crypto.randomUUID(), clinicId, apt3Id, p3Id, tomorrowIso, nurseId, now, now, now]);
  await run(`INSERT INTO follow_up_tasks VALUES (?, ?, ?, ?, 'RETRY', ?, ?, NULL, NULL, NULL, NULL, ?, ?);`, [crypto.randomUUID(), clinicId, apt4Id, p4Id, overdueIso, overdueIso, now, now]);
  await run(`INSERT INTO follow_up_tasks VALUES (?, ?, ?, ?, 'BLOCKED', ?, NULL, NULL, NULL, NULL, NULL, ?, ?);`, [crypto.randomUUID(), clinicId, apt5Id, p5Id, todayIso, now, now]);

  // Seed Interaction for Apt 2 (No Answer) & Apt 3 (Confirmed) & Apt 5 (Wrong Number)
  const int2Id = crypto.randomUUID();
  await run(`INSERT INTO interactions VALUES (?, ?, ?, ?, ?, 'CALL', 'NO_ANSWER', 'Rang 5 times, no response. Will retry later.', ?, ?);`, [int2Id, clinicId, p2Id, apt2Id, nurseId, now, now]);

  const int3Id = crypto.randomUUID();
  await run(`INSERT INTO interactions VALUES (?, ?, ?, ?, ?, 'CALL', 'CONFIRMED', 'Patient confirmed she will arrive 10 mins early tomorrow.', ?, ?);`, [int3Id, clinicId, p3Id, apt3Id, nurseId, now, now]);

  const int5Id = crypto.randomUUID();
  await run(`INSERT INTO interactions VALUES (?, ?, ?, ?, ?, 'CALL', 'WRONG_NUMBER', 'Person who answered said wrong number. Needs phone update.', ?, ?);`, [int5Id, clinicId, p5Id, apt5Id, nurseId, now, now]);

  // Audit Events
  await run(`INSERT INTO audit_events VALUES (?, ?, ?, 'appointment', ?, 'CREATE', NULL, ?, ?, NULL);`, [crypto.randomUUID(), clinicId, recId, apt1Id, JSON.stringify({ reason: 'Root Canal Stage 2 Review' }), now]);

  console.log('Seed data created successfully!');
}
