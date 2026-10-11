// src/app/missions.tsx

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { colors } from '@/theme/colors';
import { MISSIONS } from '@/data/missions';
import { getAllMissionProgress } from '@/db/database';
import { MissionProgress } from '@/types';

export default function AllMissionsScreen() {
  const db = useSQLiteContext();
  const [progress, setProgress] = useState<MissionProgress[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const rows = await getAllMissionProgress(db);
        if (!active) return;
        setProgress(rows);
      })();
      return () => {
        active = false;
      };
    }, [db]),
  );

  if (!progress) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primaryDark} />
      </View>
    );
  }

  const progressMap = new Map(progress.map((p) => [p.missionId, p]));
  const completedCount = progress.filter(
    (p) => p.status === 'completed',
  ).length;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.summary}>
        {completedCount} of {MISSIONS.length} missions completed
      </Text>

      {MISSIONS.map((mission) => {
        const p = progressMap.get(mission.id);
        const completed = p?.status === 'completed';
        const started = p !== undefined;

        return (
          <View
            key={mission.id}
            style={[styles.row, completed && styles.rowCompleted]}
          >
            <View
              style={[styles.numberBadge, completed && styles.numberBadgeDone]}
            >
              <Text
                style={[
                  styles.numberText,
                  completed && styles.numberTextDone,
                ]}
              >
                {completed ? '✓' : mission.id}
              </Text>
            </View>

            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>{mission.title}</Text>
              <Text style={styles.rowMeta}>
                {mission.floor} · {mission.baseXP} XP
                {completed && p ? ` · earned ${p.xpEarned} XP` : ''}
              </Text>
              {!completed && started && (
                <Text style={styles.rowStarted}>In progress</Text>
              )}
            </View>

            <View style={styles.statusPill}>
              {completed ? (
                <Text style={styles.statusPillTextDone}>Done</Text>
              ) : (
                <Text style={styles.statusPillTextPending}>
                  {started ? 'Started' : 'Not started'}
                </Text>
              )}
            </View>
          </View>
        );
      })}

      <Text style={styles.footnote}>
        Section names are hidden until you discover them. Read each mission's
        clue carefully.
      </Text>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  scroll: { padding: 16 },
  summary: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,    // was textSecondary — stronger
    marginBottom: 16,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowCompleted: {
    backgroundColor: '#F1FAF4',
    borderColor: '#C7E9D2',
  },
  numberBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  numberBadgeDone: {
    backgroundColor: colors.success,
  },
  numberText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primaryDeep,     // was textSecondary — much darker
  },
  numberTextDone: {
    color: colors.textOnDark,
    fontSize: 18,
  },
  rowContent: { flex: 1 },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  rowMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  rowStarted: {
    fontSize: 11,
    color: colors.accent,          // coral-pink — pops on white
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  statusPill: {
    marginLeft: 8,
    alignItems: 'flex-end',
  },
  statusPillTextDone: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 0.5,
  },
  statusPillTextPending: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,     // was textLight — now visible
    letterSpacing: 0.3,
  },
  footnote: {
    fontSize: 12,
    color: colors.textSecondary,   // was textLight — now readable
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});