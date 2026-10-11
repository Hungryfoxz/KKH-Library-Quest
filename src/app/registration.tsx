// src/app/registration.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { colors } from '@/theme/colors';
import { saveProfile } from '@/db/database';
import { StudentProfile } from '@/types';

const YEARS = ['FYIMP 1st Year', 'FYIMP 2nd Year', 'FYIMP 3rd Year', 'FYIMP 4th Year', 'FYIMP 5th Year', 'PG 1st Year', 'PG 2nd Year', 'PhD'];
const EXPERIENCES: StudentProfile['priorExperience'][] = [
  'Never',
  'A few times',
  'Often',
];

export default function RegistrationScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState<string | null>(null);
  const [priorExperience, setPriorExperience] = useState<
    StudentProfile['priorExperience'] | null
  >(null);
  const [saving, setSaving] = useState(false);

  const canSubmit =
    studentId.trim().length >= 5 &&
    department.trim().length >= 2 &&
    yearOfStudy !== null &&
    priorExperience !== null &&
    !saving;

  const handleSubmit = async () => {
    if (!canSubmit || !yearOfStudy || !priorExperience) return;

    setSaving(true);
    try {
      await saveProfile(db, {
        studentId: studentId.trim(),
        department: department.trim(),
        yearOfStudy,
        priorExperience,
      });
      router.replace('/');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not save your profile. Please try again.');
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>
          Before you begin your quest, tell us a little about yourself.
        </Text>

        {/* Student ID */}
        <Text style={styles.label}>Student ID / Roll Number</Text>
        <TextInput
          style={styles.input}
          value={studentId}
          onChangeText={setStudentId}
          placeholder="e.g., Nilav Sharma"
          placeholderTextColor={colors.textLight}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        {/* Department */}
        <Text style={styles.label}>Department</Text>
        <TextInput
          style={styles.input}
          value={department}
          onChangeText={setDepartment}
          placeholder="e.g., Computer Science"
          placeholderTextColor={colors.textLight}
          autoCapitalize="words"
        />

        {/* Year of Study */}
        <Text style={styles.label}>Year of Study</Text>
        <View style={styles.pillRow}>
          {YEARS.map((y) => (
            <TouchableOpacity
              key={y}
              style={[styles.pill, yearOfStudy === y && styles.pillActive]}
              onPress={() => setYearOfStudy(y)}
            >
              <Text
                style={[
                  styles.pillText,
                  yearOfStudy === y && styles.pillTextActive,
                ]}
              >
                {y}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Prior experience */}
        <Text style={styles.label}>
          Have you used this library before?
        </Text>
        <View style={styles.pillRow}>
          {EXPERIENCES.map((e) => (
            <TouchableOpacity
              key={e}
              style={[
                styles.pill,
                priorExperience === e && styles.pillActive,
              ]}
              onPress={() => setPriorExperience(e)}
            >
              <Text
                style={[
                  styles.pillText,
                  priorExperience === e && styles.pillTextActive,
                ]}
              >
                {e}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 32 }} />

        <TouchableOpacity
          style={[
            styles.primaryButton,
            !canSubmit && styles.primaryButtonDisabled,
          ]}
          disabled={!canSubmit}
          onPress={handleSubmit}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? 'SAVING…' : 'BEGIN EXPLORATION'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
  },
  intro: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.textSecondary,
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textPrimary,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pillActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pillTextActive: {
    color: colors.textOnDark,
  },
  primaryButton: {
    backgroundColor: colors.primaryDark,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  primaryButtonText: {
    color: colors.textOnDark,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
});