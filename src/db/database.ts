// src/db/database.ts

import * as SQLite from 'expo-sqlite';
import { StudentProfile, MissionProgress, MissionStatus } from '@/types';

export const DB_NAME = 'library_quest.db';

// ────────────────────────────────────────────────────────────
// Schema
// ────────────────────────────────────────────────────────────

const CREATE_PROFILE_TABLE = `
  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    student_id TEXT NOT NULL,
    department TEXT NOT NULL,
    year_of_study TEXT NOT NULL,
    prior_experience TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`;

const CREATE_MISSION_PROGRESS_TABLE = `
  CREATE TABLE IF NOT EXISTS mission_progress (
    mission_id INTEGER PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'available',
    started_at INTEGER,
    completed_at INTEGER,
    hints_used INTEGER NOT NULL DEFAULT 0,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    challenge_answer TEXT NOT NULL DEFAULT ''
  );
`;

const CREATE_INTERACTION_LOG_TABLE = `
  CREATE TABLE IF NOT EXISTS interaction_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id INTEGER,
    event_type TEXT NOT NULL,
    event_data TEXT,
    timestamp INTEGER NOT NULL
  );
`;

// Safe column migration — adds a column only if it doesn't exist yet.
async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table})`,
  );
  if (!cols.some((c) => c.name === column)) {
    await db.execAsync(
      `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`,
    );
  }
}

export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync(CREATE_PROFILE_TABLE);
  await db.execAsync(CREATE_MISSION_PROGRESS_TABLE);
  await db.execAsync(CREATE_INTERACTION_LOG_TABLE);

  // Safe migration for older installs
  await ensureColumn(
    db,
    'mission_progress',
    'challenge_answer',
    "TEXT NOT NULL DEFAULT ''",
  );
}

// ────────────────────────────────────────────────────────────
// Profile
// ────────────────────────────────────────────────────────────

export async function saveProfile(
  db: SQLite.SQLiteDatabase,
  profile: StudentProfile,
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO profile
       (id, student_id, department, year_of_study, prior_experience, created_at)
     VALUES (1, ?, ?, ?, ?, ?)`,
    profile.studentId,
    profile.department,
    profile.yearOfStudy,
    profile.priorExperience,
    Date.now(),
  );
}

export async function loadProfile(
  db: SQLite.SQLiteDatabase,
): Promise<StudentProfile | null> {
  const row = await db.getFirstAsync<{
    student_id: string;
    department: string;
    year_of_study: string;
    prior_experience: string;
  }>(
    'SELECT student_id, department, year_of_study, prior_experience FROM profile WHERE id = 1',
  );
  if (!row) return null;
  return {
    studentId: row.student_id,
    department: row.department,
    yearOfStudy: row.year_of_study,
    priorExperience: row.prior_experience as StudentProfile['priorExperience'],
  };
}

// ────────────────────────────────────────────────────────────
// Interaction logging
// ────────────────────────────────────────────────────────────

export async function logEvent(
  db: SQLite.SQLiteDatabase,
  eventType: string,
  missionId: number | null,
  eventData?: Record<string, unknown>,
): Promise<void> {
  await db.runAsync(
    'INSERT INTO interaction_log (mission_id, event_type, event_data, timestamp) VALUES (?, ?, ?, ?)',
    missionId,
    eventType,
    eventData ? JSON.stringify(eventData) : null,
    Date.now(),
  );
}

// ────────────────────────────────────────────────────────────
// Mission progress
// ────────────────────────────────────────────────────────────

export async function getMissionProgress(
  db: SQLite.SQLiteDatabase,
  missionId: number,
): Promise<MissionProgress | null> {
  const row = await db.getFirstAsync<{
    mission_id: number;
    status: string;
    started_at: number | null;
    completed_at: number | null;
    hints_used: number;
    xp_earned: number;
    challenge_answer: string;
  }>(
    'SELECT * FROM mission_progress WHERE mission_id = ?',
    missionId,
  );
  if (!row) return null;
  return {
    missionId: row.mission_id,
    status: row.status as MissionStatus,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    hintsUsed: row.hints_used,
    xpEarned: row.xp_earned,
    challengeAnswer: row.challenge_answer ?? '',
  };
}

export async function getAllMissionProgress(
  db: SQLite.SQLiteDatabase,
): Promise<MissionProgress[]> {
  const rows = await db.getAllAsync<{
    mission_id: number;
    status: string;
    started_at: number | null;
    completed_at: number | null;
    hints_used: number;
    xp_earned: number;
    challenge_answer: string;
  }>('SELECT * FROM mission_progress');
  return rows.map((r) => ({
    missionId: r.mission_id,
    status: r.status as MissionStatus,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    hintsUsed: r.hints_used,
    xpEarned: r.xp_earned,
    challengeAnswer: r.challenge_answer ?? '',
  }));
}

export async function startMission(
  db: SQLite.SQLiteDatabase,
  missionId: number,
): Promise<void> {
  const existing = await getMissionProgress(db, missionId);
  if (existing?.status === 'completed') return;

  await db.runAsync(
    `INSERT INTO mission_progress (mission_id, status, started_at, hints_used, xp_earned, challenge_answer)
     VALUES (?, 'available', ?, 0, 0, '')
     ON CONFLICT(mission_id) DO UPDATE SET
       status = 'available',
       started_at = COALESCE(mission_progress.started_at, excluded.started_at)`,
    missionId,
    Date.now(),
  );
  await logEvent(db, 'mission_started', missionId);
}

export async function logHintUsed(
  db: SQLite.SQLiteDatabase,
  missionId: number,
  hintLevel: number,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO mission_progress (mission_id, status, hints_used)
     VALUES (?, 'available', 1)
     ON CONFLICT(mission_id) DO UPDATE SET
       hints_used = mission_progress.hints_used + 1`,
    missionId,
  );
  await logEvent(db, 'hint_used', missionId, { hintLevel });
}

// ────────────────────────────────────────────────────────────
// UPDATED: completeMission now takes the challenge answer
// ────────────────────────────────────────────────────────────
export async function completeMission(
  db: SQLite.SQLiteDatabase,
  missionId: number,
  xpEarned: number,
  hintsUsed: number,
  challengeAnswer: string,
): Promise<void> {
  const trimmed = challengeAnswer.trim();

  await db.runAsync(
    `INSERT INTO mission_progress
       (mission_id, status, completed_at, hints_used, xp_earned, challenge_answer)
     VALUES (?, 'completed', ?, ?, ?, ?)
     ON CONFLICT(mission_id) DO UPDATE SET
       status = 'completed',
       completed_at = excluded.completed_at,
       hints_used = excluded.hints_used,
       xp_earned = excluded.xp_earned,
       challenge_answer = excluded.challenge_answer`,
    missionId,
    Date.now(),
    hintsUsed,
    xpEarned,
    trimmed,
  );

  await logEvent(db, 'mission_completed', missionId, {
    xpEarned,
    hintsUsed,
  });
  await logEvent(db, 'challenge_answered', missionId, {
    answer: trimmed,
  });
}

export async function logScanSuccess(
  db: SQLite.SQLiteDatabase,
  missionId: number,
  code: string,
): Promise<void> {
  await logEvent(db, 'qr_scan_success', missionId, { code });
}

export async function logScanFailure(
  db: SQLite.SQLiteDatabase,
  missionId: number,
  scanned: string,
): Promise<void> {
  await logEvent(db, 'qr_scan_failure', missionId, { scanned });
}

// ────────────────────────────────────────────────────────────
// Aggregates
// ────────────────────────────────────────────────────────────

export async function getTotalXP(db: SQLite.SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ total: number | null }>(
    'SELECT SUM(xp_earned) AS total FROM mission_progress',
  );
  return row?.total ?? 0;
}

export async function getTotalHintsUsed(
  db: SQLite.SQLiteDatabase,
): Promise<number> {
  const row = await db.getFirstAsync<{ total: number | null }>(
    'SELECT SUM(hints_used) AS total FROM mission_progress',
  );
  return row?.total ?? 0;
}

export async function getCompletedMissionsCount(
  db: SQLite.SQLiteDatabase,
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM mission_progress WHERE status = 'completed'",
  );
  return row?.count ?? 0;
}

export async function resetDatabase(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  await db.execAsync('DELETE FROM interaction_log;');
  await db.execAsync('DELETE FROM mission_progress;');
  await db.execAsync('DELETE FROM profile;');
}