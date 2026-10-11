// src/db/export.ts

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SQLite from 'expo-sqlite';
import { loadProfile } from './database';
import { MISSIONS } from '@/data/missions';

// ────────────────────────────────────────────────────────────
// CSV helpers (RFC 4180 compliant)
// ────────────────────────────────────────────────────────────

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(','));
  }
  // Excel-friendly: CRLF line endings, trailing newline
  return lines.join('\r\n') + '\r\n';
}

function timestampSlug(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

function isoOrEmpty(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '';
  return new Date(ms).toISOString();
}

// ────────────────────────────────────────────────────────────
// Main export
// ────────────────────────────────────────────────────────────

export interface ExportResult {
  files: string[];
}

export async function exportStudentData(
  db: SQLite.SQLiteDatabase,
): Promise<ExportResult> {
  const profile = await loadProfile(db);
  if (!profile) {
    throw new Error('Cannot export: no profile found');
  }

  // Registration timestamp
  const createdRow = await db.getFirstAsync<{ created_at: number }>(
    'SELECT created_at FROM profile WHERE id = 1',
  );
  const registeredAt = createdRow?.created_at ?? null;

  const studentSlug = profile.studentId.replace(/[^A-Za-z0-9_-]/g, '_');
  const ts = timestampSlug();
  const files: string[] = [];

  // ─── File 1: Per-mission summary ─────────────────────
  const missionRows = await db.getAllAsync<{
  mission_id: number;
  status: string;
  started_at: number | null;
  completed_at: number | null;
  hints_used: number;
  xp_earned: number;
  challenge_answer: string;
}>(`
  SELECT mission_id, status, started_at, completed_at, hints_used, xp_earned, challenge_answer
  FROM mission_progress
  ORDER BY mission_id
`);

  const scanCounts = await db.getAllAsync<{
    mission_id: number;
    event_type: string;
    count: number;
  }>(`
    SELECT mission_id, event_type, COUNT(*) AS count
    FROM interaction_log
    WHERE event_type IN ('qr_scan_success', 'qr_scan_failure')
      AND mission_id IS NOT NULL
    GROUP BY mission_id, event_type
  `);

  const scanMap = new Map<string, number>();
  for (const r of scanCounts) {
    scanMap.set(`${r.mission_id}:${r.event_type}`, r.count);
  }

  const missionHeaders = [
    'student_id',
    'department',
    'year_of_study',
    'prior_experience',
    'registered_at_iso',
    'mission_id',
    'mission_title',
    'target_section',
    'floor',
    'status',
    'started_at_iso',
    'completed_at_iso',
    'duration_seconds',
    'hints_used',
    'xp_earned',
    'scan_successes',
    'scan_failures',
    'challenge',
    'challenge_answer',
  ];

  const missionData = missionRows.map((r) => {
    const meta = MISSIONS.find((m) => m.id === r.mission_id);
    const durationSec =
      r.started_at && r.completed_at
        ? Math.round((r.completed_at - r.started_at) / 1000)
        : '';
    return [
      profile.studentId,
      profile.department,
      profile.yearOfStudy,
      profile.priorExperience,
      isoOrEmpty(registeredAt),
      r.mission_id,
      meta?.title ?? '',
      meta?.targetSection ?? '',
      meta?.floor ?? '',
      r.status,
      isoOrEmpty(r.started_at),
      isoOrEmpty(r.completed_at),
      durationSec,
      r.hints_used,
      r.xp_earned,
      scanMap.get(`${r.mission_id}:qr_scan_success`) ?? 0,
      scanMap.get(`${r.mission_id}:qr_scan_failure`) ?? 0,
      meta?.challenge ?? '',
      r.challenge_answer ?? '',
    ];
  });

  const missionCSV = toCSV(missionHeaders, missionData);
  const missionPath = `${FileSystem.documentDirectory}LibraryQuest_${studentSlug}_missions_${ts}.csv`;
  await FileSystem.writeAsStringAsync(missionPath, missionCSV);
  files.push(missionPath);

  // ─── File 2: Raw event log ───────────────────────────
  const logRows = await db.getAllAsync<{
    id: number;
    mission_id: number | null;
    event_type: string;
    event_data: string | null;
    timestamp: number;
  }>(`
    SELECT id, mission_id, event_type, event_data, timestamp
    FROM interaction_log
    ORDER BY timestamp
  `);

  const logHeaders = [
    'student_id',
    'event_id',
    'mission_id',
    'event_type',
    'event_data',
    'timestamp_iso',
    'timestamp_ms',
  ];

  const logData = logRows.map((r) => [
    profile.studentId,
    r.id,
    r.mission_id ?? '',
    r.event_type,
    r.event_data ?? '',
    isoOrEmpty(r.timestamp),
    r.timestamp,
  ]);

  const logCSV = toCSV(logHeaders, logData);
  const logPath = `${FileSystem.documentDirectory}LibraryQuest_${studentSlug}_log_${ts}.csv`;
  await FileSystem.writeAsStringAsync(logPath, logCSV);
  files.push(logPath);

  return { files };
}

// ────────────────────────────────────────────────────────────
// Share the exported files
// ────────────────────────────────────────────────────────────

export async function shareExport(files: string[]): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device');
  }
  for (const file of files) {
    await Sharing.shareAsync(file, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Library Quest Data',
      UTI: 'public.comma-separated-values-text',
    });
  }
}