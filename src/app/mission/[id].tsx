// src/app/mission/[id].tsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Vibration,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '@/theme/colors';
import { MISSIONS } from '@/data/missions';
import {
  startMission,
  logHintUsed,
  completeMission,
  logScanSuccess,
  logScanFailure,
  getCompletedMissionsCount,
} from '@/db/database';

// ────────────────────────────────────────────────────────────
// Hint costs and text
// ────────────────────────────────────────────────────────────
const HINT_COSTS = [0, 0, 1, 10]; // index = hint level (0 = none)

function getHintText(missionId: number, level: number): string {
  const mission = MISSIONS.find((m) => m.id === missionId);
  if (!mission) return '';
  const floor = mission.floor;
  const section = mission.targetSection;
  if (level === 1)
    return 'Read the clue again slowly. What noun is the clue asking you to find?';
  if (level === 2)
    return `It is on the ${floor}. Look for signs with section names.`;
  if (level === 3)
    return `The section you are looking for is the ${section}.`;
  return '';
}

type Phase = 'briefing' | 'scanning' | 'challenge' | 'complete';

export default function MissionScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const missionId = Number(id);
  const mission = MISSIONS.find((m) => m.id === missionId);

  const [phase, setPhase] = useState<Phase>('briefing');
  const [hintLevel, setHintLevel] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [xpEarned, setXpEarned] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);
  const [questFinished, setQuestFinished] = useState(false);
  const scannedRef = useRef(false);

  const [permission, requestPermission] = useCameraPermissions();

  // Log mission start once
  useEffect(() => {
    if (!mission) return;
    startMission(db, mission.id).catch(console.error);
  }, [db, mission]);

  if (!mission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Mission not found.</Text>
      </View>
    );
  }

  // ────────────────────────────────────────────────────────
  // Actions
  // ────────────────────────────────────────────────────────

  const handleRequestHint = async () => {
    if (hintLevel >= 3) return;
    const next = hintLevel + 1;
    setHintLevel(next);
    setHintsUsed((h) => h + 1);
    await logHintUsed(db, mission.id, next);
  };

  const handleStartScanning = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          'Camera permission needed',
          'Library Quest needs camera access to scan the checkpoint QR code.',
        );
        return;
      }
    }
    scannedRef.current = false;
    setScanError(null);
    setPhase('scanning');
  };

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      Vibration.vibrate(80);

      if (data === mission.qrCode) {
        await logScanSuccess(db, mission.id, data);
        setPhase('challenge');
      } else {
        await logScanFailure(db, mission.id, data);
        setScanError(
          `That is not the checkpoint for this mission.\nKeep exploring — you'll find it.`,
        );
        setTimeout(() => {
          scannedRef.current = false;
        }, 1500);
      }
    },
    [db, mission.id, mission.qrCode],
  );

  const handleSubmitChallenge = async () => {
    if (challengeAnswer.trim().length < 1) {
      Alert.alert('Please enter an answer');
      return;
    }

    const hintPenalty = HINT_COSTS.slice(1, hintsUsed + 1).reduce(
      (s, c) => s + c,
      0,
    );
    const challengeBonus = 30;
    const finalXP = Math.max(0, mission.baseXP + challengeBonus - hintPenalty);

    await completeMission(db, mission.id, finalXP, hintsUsed, challengeAnswer);

    // Check whether all missions are now complete
    const count = await getCompletedMissionsCount(db);
    setQuestFinished(count >= MISSIONS.length);

    setXpEarned(finalXP);
    setPhase('complete');
  };

  const handleFinish = () => {
    if (questFinished) {
      router.replace('/quest-complete');
    } else {
      router.replace('/');
    }
  };

  // ────────────────────────────────────────────────────────
  // Render — briefing
  // ────────────────────────────────────────────────────────

  if (phase === 'briefing') {
    return (
      <>
        <Stack.Screen options={{ title: `Mission ${mission.id}` }} />
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.missionNumber}>
            MISSION {mission.id} OF {MISSIONS.length}
          </Text>
          <Text style={styles.missionTitle}>{mission.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>🏛 {mission.floor}</Text>
            </View>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>⭐ {mission.baseXP} XP</Text>
            </View>
          </View>

          <View style={styles.clueCard}>
            <Text style={styles.clueLabel}>📖 THE CLUE</Text>
            <Text style={styles.clueText}>{mission.clue}</Text>
          </View>

          {hintLevel > 0 && (
            <View style={styles.hintCard}>
              <Text style={styles.hintLabel}>
                💡 HINT {hintLevel} — {HINT_COSTS[hintLevel]} XP
              </Text>
              <Text style={styles.hintText}>
                {getHintText(mission.id, hintLevel)}
              </Text>
            </View>
          )}

          {hintLevel < 3 ? (
            <TouchableOpacity
              style={styles.hintButton}
              onPress={handleRequestHint}
            >
              <Text style={styles.hintButtonText}>
                💡 Request Hint ({HINT_COSTS[hintLevel + 1]} XP)
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.hintExhausted}>
              <Text style={styles.hintExhaustedText}>
                No more hints available
              </Text>
            </View>
          )}

          <View style={{ height: 12 }} />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStartScanning}
          >
            <Text style={styles.primaryButtonText}>
              📍 I'M GOING TO FIND IT
            </Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </>
    );
  }

  // ────────────────────────────────────────────────────────
  // Render — scanning
  // ────────────────────────────────────────────────────────

  if (phase === 'scanning') {
    return (
      <>
        <Stack.Screen options={{ title: 'Scan Checkpoint' }} />
        <View style={styles.cameraContainer}>
          {permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcodeScanned}
            />
          ) : (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.textOnDark} />
              <Text style={styles.permissionText}>
                Requesting camera permission…
              </Text>
            </View>
          )}

          <View style={styles.scanOverlay} pointerEvents="none">
            <View style={styles.scanFrame} />
            <Text style={styles.scanInstruction}>
              Point at the checkpoint QR code
            </Text>
          </View>

          {scanError && (
            <View style={styles.scanErrorBox}>
              <Text style={styles.scanErrorText}>{scanError}</Text>
            </View>
          )}

          <View style={styles.cameraBottomBar}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setPhase('briefing')}
            >
              <Text style={styles.cancelButtonText}>← Back to briefing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  // ────────────────────────────────────────────────────────
  // Render — challenge
  // ────────────────────────────────────────────────────────

  if (phase === 'challenge') {
    return (
      <>
        <Stack.Screen options={{ title: 'Mission Challenge' }} />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.successBanner}>
              <Text style={styles.successTitle}>✅ CHECKPOINT REACHED</Text>
              <Text style={styles.successSubtitle}>
                You found the {mission.targetSection}
              </Text>
            </View>

            <View style={styles.clueCard}>
              <Text style={styles.clueLabel}>🎯 BONUS CHALLENGE</Text>
              <Text style={styles.clueText}>
                {mission.challenge}
              </Text>
            </View>

            <TextInput
              style={styles.answerInput}
              value={challengeAnswer}
              onChangeText={setChallengeAnswer}
              placeholder="Your answer…"
              placeholderTextColor={colors.textLight}
              multiline
              autoFocus
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSubmitChallenge}
            >
              <Text style={styles.primaryButtonText}>SUBMIT ANSWER</Text>
            </TouchableOpacity>

            <View style={{ height: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </>
    );
  }

  // ────────────────────────────────────────────────────────
  // Render — complete
  // ────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{ title: 'Mission Complete' }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.completeContainer}>
          <Text style={styles.completeEmoji}>🏆</Text>
          <Text style={styles.completeTitle}>MISSION COMPLETE</Text>
          <Text style={styles.completeSection}>{mission.targetSection}</Text>

          <View style={styles.xpCard}>
            <Text style={styles.xpLabel}>XP EARNED</Text>
            <Text style={styles.xpValue}>+{xpEarned}</Text>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{hintsUsed}</Text>
              <Text style={styles.statBoxLabel}>Hints Used</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>⭐</Text>
              <Text style={styles.statBoxLabel}>{mission.badgeName}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleFinish}
        >
          <Text style={styles.primaryButtonText}>
            {questFinished ? '🏆 SEE YOUR RESULTS' : 'BACK TO PROFILE'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 12,
  },
  errorText: { fontSize: 15, color: colors.textSecondary },
  scroll: { padding: 20 },
  missionNumber: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.textSecondary,
  },
  missionTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 6,
    marginBottom: 12,
  },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  metaPill: {
    backgroundColor: colors.cardAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  metaPillText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  clueCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  clueLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.accent,
    marginBottom: 12,
  },
  clueText: {
    fontSize: 17,
    lineHeight: 26,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
  hintCard: {
    backgroundColor: '#FFF8E7',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    marginBottom: 12,
  },
  hintLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.accent,
    marginBottom: 6,
  },
  hintText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  hintButton: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  hintButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  hintExhausted: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  hintExhaustedText: {
    fontSize: 13,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  primaryButton: {
    backgroundColor: colors.primaryDark,
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
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 260,
    height: 260,
    borderWidth: 3,
    borderColor: colors.accent,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  scanInstruction: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  permissionText: {
    color: colors.textOnDark,
    fontSize: 14,
    marginTop: 12,
  },
  scanErrorBox: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    backgroundColor: colors.error,
    padding: 12,
    borderRadius: 10,
  },
  scanErrorText: {
    color: '#FFFFFF',
    fontSize: 13,
    textAlign: 'center',
  },
  cameraBottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
  },
  cancelButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  successBanner: {
    backgroundColor: colors.primaryDark,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  successTitle: {
    color: colors.textOnDark,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  successSubtitle: {
    color: colors.accentLight,
    fontSize: 14,
    marginTop: 6,
  },
  answerInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    minHeight: 90,
    fontSize: 15,
    color: colors.textPrimary,
    textAlignVertical: 'top',
    marginTop: 8,
    marginBottom: 20,
  },
  completeContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  completeEmoji: { fontSize: 64, marginBottom: 8 },
  completeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primaryDark,
    letterSpacing: 2,
  },
  completeSection: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 32,
  },
  xpCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
    marginBottom: 20,
  },
  xpLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.textSecondary,
  },
  xpValue: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.accent,
    marginTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  statBoxLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});