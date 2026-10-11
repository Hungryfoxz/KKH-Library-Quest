// src/types/index.ts

export type Floor = 'Ground Floor' | 'First Floor' | 'Second Floor';

export interface Mission {
  id: number;
  title: string;
  targetSection: string;
  floor: Floor;
  clue: string;
  challenge: string;
  baseXP: number;
  badgeName: string;
  qrCode: string;          // ← NEW: what the QR at the section encodes
}

export interface StudentProfile {
  studentId: string;
  department: string;
  yearOfStudy: string;
  priorExperience: 'Never' | 'A few times' | 'Often';
}

export type MissionStatus = 'locked' | 'available' | 'completed';

export interface MissionProgress {
  missionId: number;
  status: MissionStatus;
  startedAt: number | null;
  completedAt: number | null;
  hintsUsed: number;
  xpEarned: number;
  challengeAnswer: string;
}