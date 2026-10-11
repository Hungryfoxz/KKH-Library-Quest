// src/app/quest-complete.tsx

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { colors } from '@/theme/colors';
import {
  MISSIONS,
  computeLevel,
  LEVEL_TITLES,
} from '@/data/missions';
import {
  loadProfile,
  getTotalXP,
  getTotalHintsUsed,
  getCompletedMissionsCount,
} from '@/db/database';
import { exportStudentData, shareExport } from '@/db/export';
import { StudentProfile } from '@/types';
import { EmojiAnimal } from '@/components/EmojiAnimal';

export default function QuestCompleteScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentXP, setCurrentXP] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [missionsCompleted, setMissionsCompleted] = useState(0);
  const [exporting, setExporting] = useState(false);

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

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { files } = await exportStudentData(db);
      await shareExport(files);
    } catch (err) {
      console.error(err);
      Alert.alert(
        'Export failed',
        'Could not export your data. Please try again or contact the study coordinator.',
      );
    } finally {
      setExporting(false);
    }
  };

  if (loading || !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primaryDark} />
      </View>
    );
  }

  const level = computeLevel(currentXP);
  const levelTitle = LEVEL_TITLES[level] ?? 'Explorer';
  const totalMissions = MISSIONS.length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.trophy}>🏆</Text>
          <Text style={styles.title}>QUEST COMPLETE</Text>
          <Text style={styles.subtitle}>
            You have discovered all {totalMissions} knowledge zones of the
            KK Handiqui Library.
          </Text>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <Text style={styles.cardLabel}>📊 YOUR STATISTICS</Text>

          <StatRow label="Final Level" value={`${level} — ${levelTitle}`} />
          <StatRow label="Total XP" value={`${currentXP}`} />
          <StatRow
            label="Missions Completed"
            value={`${missionsCompleted}/${totalMissions}`}
          />
          <StatRow
            label="Badges Earned"
            value={`${missionsCompleted}/${MISSIONS.length}`}
          />
          <StatRow label="Hints Used" value={`${hintsUsed}`} />
        </View>

        {/* Export Card */}
        <View style={styles.exportCard}>
          <Text style={styles.exportLabel}>📤 RESEARCH DATA</Text>
          <Text style={styles.exportDesc}>
            Share your interaction data with the study coordinator. This
            includes your mission times, hints used, and QR scan attempts.
          </Text>

          <TouchableOpacity
            style={[
              styles.exportButton,
              exporting && styles.exportButtonDisabled,
            ]}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.85}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={colors.textOnDark} />
            ) : (
              <Text style={styles.exportButtonText}>EXPORT DATA (CSV)</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Return */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.secondaryButtonText}>Return to Profile</Text>
        </TouchableOpacity>

        <EmojiAnimal/>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statKey}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
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
  scroll: { padding: 16, paddingTop: 24 },

  hero: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  trophy: { fontSize: 72, marginBottom: 8 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },

  statsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardAlt,
  },
  statKey: { fontSize: 14, color: colors.textSecondary },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },

  exportCard: {
    backgroundColor: '#FFF8E7',
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  exportLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.accent,
    marginBottom: 10,
  },
  exportDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  exportButton: {
    backgroundColor: colors.primaryDark,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  exportButtonDisabled: { opacity: 0.7 },
  exportButtonText: {
    color: colors.textOnDark,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },

  secondaryButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});