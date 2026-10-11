// src/app/index.tsx

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { colors } from '@/theme/colors';
import {
  MISSIONS,
  LEVEL_TITLES,
  LEVEL_THRESHOLDS,
  computeLevel,
  xpForNextLevel,
} from '@/data/missions';
import { StudentProfile } from '@/types';
import { Stat } from '@/components/Stat';
import {
  loadProfile,
  getTotalXP,
  getTotalHintsUsed,
  getCompletedMissionsCount,
} from '@/db/database';
import { EmojiAnimal } from '@/components/EmojiAnimal';
export default function ProfileScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentXP, setCurrentXP] = useState(0);
  const [missionsCompleted, setMissionsCompleted] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        const p = await loadProfile(db);
        if (!active) return;

        if (!p) {
          router.replace('/registration');
          return;
        }

        const [xp, completed, hints] = await Promise.all([
          getTotalXP(db),
          getCompletedMissionsCount(db),
          getTotalHintsUsed(db),
        ]);
        if (!active) return;

        setProfile(p);
        setCurrentXP(xp);
        setMissionsCompleted(completed);
        setHintsUsed(hints);
        setLoading(false);
      })();

      return () => {
        active = false;
      };
    }, [db, router]),
  );

  if (loading || !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primaryDark} />
      </View>
    );
  }

  const totalMissions = MISSIONS.length;
  const currentLevel = computeLevel(currentXP);
  const nextLevelXP = xpForNextLevel(currentXP);
  const badgesEarned = missionsCompleted;

  const levelFloorXP =
    currentLevel === 1 ? 0 : LEVEL_THRESHOLDS[currentLevel - 1];
  const xpProgress = Math.min(
    (currentXP - levelFloorXP) / Math.max(1, nextLevelXP - levelFloorXP),
    1,
  );

  const nextMission = MISSIONS[missionsCompleted] ?? null;
  const allComplete = missionsCompleted >= totalMissions;

  const handleStartMission = (missionId: number) => {
    router.push(`/mission/${missionId}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header ────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🧭 LIBRARY QUEST</Text>
          <Text style={styles.headerSubtitle}>KK Handiqui Library</Text>
        </View>

        {/* ─── Explorer Profile Card ─────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>🔍 EXPLORER PROFILE</Text>

          <View style={styles.profileRow}>
            <Text style={styles.profileKey}>Student ID</Text>
            <Text style={styles.profileValue}>{profile.studentId}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileKey}>Department</Text>
            <Text style={styles.profileValue}>{profile.department}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileKey}>Year</Text>
            <Text style={styles.profileValue}>{profile.yearOfStudy}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileKey}>Prior experience</Text>
            <Text style={styles.profileValue}>{profile.priorExperience}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.levelText}>
            Level {currentLevel} — {LEVEL_TITLES[currentLevel] ?? 'Explorer'}
          </Text>

          <View style={styles.progressContainer}>
            <View
              style={[styles.progressFill, { width: `${xpProgress * 100}%` }]}
            />
          </View>
          <Text style={styles.xpText}>
            {currentXP} / {nextLevelXP} XP
          </Text>

          <View style={styles.statGrid}>
            <Stat
              label="Missions"
              value={`${missionsCompleted}/${totalMissions}`}
            />
            <Stat label="Badges" value={`${badgesEarned}/${MISSIONS.length}`} />
            <Stat label="Hints Used" value={`${hintsUsed}`} />
          </View>
        </View>

        {/* ─── Next Mission Card ─────────────────────── */}
        {nextMission && !allComplete ? (
          <View style={[styles.card, styles.missionCard]}>
            <Text style={styles.cardLabel}>📍 NEXT MISSION</Text>
            <Text style={styles.missionNumber}>
              Mission {nextMission.id} of {totalMissions}
            </Text>
            <Text style={styles.missionTitle}>{nextMission.title}</Text>

            <View style={styles.missionMeta}>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>🏛 {nextMission.floor}</Text>
              </View>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>
                  ⭐ {nextMission.baseXP} XP
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={() => handleStartMission(nextMission.id)}
            >
              <Text style={styles.primaryButtonText}>
                START MISSION {nextMission.id}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, styles.missionCard]}>
            <Text style={styles.cardLabel}>🏆 QUEST STATUS</Text>
            <Text style={styles.missionTitle}>Quest Complete!</Text>
            <Text style={styles.completedText}>
              You have discovered all {totalMissions} knowledge zones of the
              KK Handiqui Library.
            </Text>

            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 16 }]}
              activeOpacity={0.85}
              onPress={() => router.push('/quest-complete')}
            >
              <Text style={styles.primaryButtonText}>VIEW YOUR RESULTS</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Secondary Actions ─────────────────────── */}
        <View style={styles.secondaryRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/missions')}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>View All Missions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/help')}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Help</Text>
          </TouchableOpacity>
        </View>

        <EmojiAnimal />
        <Text style={styles.footer}>
          Designed and Developed by Khanikar, KK
        </Text>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 24 },

  // ─── Header ────────────────────────────────────────
  header: {
    backgroundColor: colors.primary,
    paddingTop: 24,
    paddingBottom: 36,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTitle: {
    fontSize: 30,                       // was 22 — larger now
    fontWeight: '800',                  // bolder
    color: colors.primaryDeep,          // dark purple on pink bg
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 15,                       // was 13 — larger now
    color: colors.primaryDark,          // medium purple
    marginTop: 6,
    letterSpacing: 0.4,
    fontWeight: '500',
  },

  // ─── Cards ─────────────────────────────────────────
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#4A1E54',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.primaryDark,
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  profileKey: { fontSize: 14, color: colors.textSecondary },
  profileValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  levelText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 10,
  },
  progressContainer: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.progressTrack,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.progressFill,
    borderRadius: 5,
  },
  xpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'right',
  },
  statGrid: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'space-between',
  },

  // ─── Mission Card ──────────────────────────────────
  missionCard: { borderWidth: 1, borderColor: colors.border },
  missionNumber: {
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  missionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
    marginBottom: 12,
  },
  missionMeta: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  metaPill: {
    backgroundColor: colors.cardAlt,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  metaPillText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.primaryDark,   // deep purple button
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.textOnDark,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  completedText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  secondaryRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textLight,
    letterSpacing: 0.4,
    marginTop: 16,
    paddingHorizontal: 20,
  },
});