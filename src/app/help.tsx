// src/app/help.tsx

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors } from '@/theme/colors';

export default function HelpScreen() {
  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Section title="What is Library Quest?">
        <Text style={styles.para}>
          A gamified way to discover the KK Handiqui Library. Instead of a
          guided tour where someone tells you where things are, you follow
          clues to find each section yourself — and learn why each one
          matters along the way.
        </Text>
      </Section>

      <Section title="How to Play">
        <Step n={1}>
          <Text style={styles.stepText}>
            Read the clue on the mission screen. Each clue describes a
            section of the library without naming it.
          </Text>
        </Step>
        <Step n={2}>
          <Text style={styles.stepText}>
            Walk around the library and find the section that matches the
            clue.
          </Text>
        </Step>
        <Step n={3}>
          <Text style={styles.stepText}>
            Look for the small QR code placed near the section. Scan it with
            the app's camera to confirm you've arrived.
          </Text>
        </Step>
        <Step n={4}>
          <Text style={styles.stepText}>
            Answer the challenge question — usually asking you to find one
            item in the section.
          </Text>
        </Step>
        <Step n={5}>
          <Text style={styles.stepText}>
            Earn XP, unlock the next mission, and keep exploring. Complete
            all 10 missions to finish the quest.
          </Text>
        </Step>
      </Section>

      <Section title="Hints">
        <Text style={styles.para}>
          Each mission offers up to three progressive hints. The first hint
          is free; later hints cost XP (10, 20, then 30). Only request a
          hint if you're genuinely stuck — the discovery is the point.
        </Text>
      </Section>

      <Section title="QR Codes">
        <Text style={styles.para}>
          Every section has one QR code. If you scan the wrong one, you'll
          get a gentle nudge to keep looking. Make sure you have good
          lighting and hold your phone steady about 20–30 cm from the code.
        </Text>
      </Section>

      <Section title="XP and Levels">
        <Text style={styles.para}>
          You earn XP by completing missions and answering challenge
          questions. Hints reduce the XP you earn for that mission. Your
          level rises as you accumulate XP — from Curious Newcomer all the
          way to Library Explorer.
        </Text>
      </Section>

      <Section title="Camera Permission">
        <Text style={styles.para}>
          Library Quest needs access to your camera to scan QR codes. If
          you accidentally denied it, open your phone's Settings → Apps →
          Expo Go (or Library Quest) → Permissions → Camera and enable it.
        </Text>
      </Section>

      <Section title="Need More Help?">
        <Text style={styles.para}>
          Contact the study coordinator or ask at the circulation counter.
          If the app crashes or a QR code isn't scanning, note the mission
          number and report it after your session.
        </Text>
      </Section>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{n}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  sectionBody: {
    gap: 10,
  },
  para: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textPrimary,
  },
});