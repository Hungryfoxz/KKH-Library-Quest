// src/components/Stat.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, alignItems: 'center' },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryDark,       // was colors.primary
  },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.3,
  },
});