// src/app/_layout.tsx

import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { initDatabase, DB_NAME } from '@/db/database';

function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primaryDark} />
      <Text style={styles.loadingText}>Preparing Library Quest…</Text>
    </View>
  );
}

function CloseButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      style={styles.closeButton}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Text style={styles.closeButtonText}>Close</Text>
    </TouchableOpacity>
  );
}

export default function RootLayout() {
  return (
    <Suspense fallback={<Loading />}>
      <SafeAreaProvider>
        <SQLiteProvider databaseName={DB_NAME} onInit={initDatabase}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.primary },
              headerTintColor: colors.primaryDeep,
              headerTitleStyle: {
                fontWeight: '800',
                fontSize: 18,
                color: colors.primaryDeep,
              },
              headerTitleAlign: 'center',
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
              name="registration"
              options={{ title: 'Who Is Exploring Today?' }}
            />
            <Stack.Screen name="mission/[id]" options={{ title: 'Mission' }} />
            <Stack.Screen
              name="quest-complete"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="missions"
              options={{
                presentation: 'modal',
                title: 'All Missions',
                headerRight: () => <CloseButton />,
              }}
            />
            <Stack.Screen
              name="help"
              options={{
                presentation: 'modal',
                title: 'Help',
                headerRight: () => <CloseButton />,
              }}
            />
          </Stack>
        </SQLiteProvider>
      </SafeAreaProvider>
    </Suspense>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  closeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeButtonText: {
    color: colors.primaryDeep,   // was textOnDark (white) — invisible now
    fontSize: 15,
    fontWeight: '700',
  },
});