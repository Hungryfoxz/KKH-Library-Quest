// src/components/EmojiAnimal.tsx

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

// Animals cycle in this order. Add or remove freely.
const ANIMALS = ['🐰', '🐱', '🐼', '🦊'];

// How often the animal changes (milliseconds)
const CHANGE_EVERY = 60000;

export function EmojiAnimal() {
  const [index, setIndex] = useState(0);

  // Hop animation — 0 = on ground, 1 = at peak
  const hop = useRef(new Animated.Value(0)).current;

  // Cycle through animals
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % ANIMALS.length);
    }, CHANGE_EVERY);
    return () => clearInterval(interval);
  }, []);

  // Continuous hop loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        // Sit still on the ground
        Animated.timing(hop, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
        // Leap up
        Animated.timing(hop, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        // Fall back down
        Animated.timing(hop, {
          toValue: 0,
          duration: 320,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [hop]);

  // Vertical translation
  const translateY = hop.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -34],
  });

  // Squash on the ground, stretch at the peak — classic squash-and-stretch
  const scaleY = hop.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.92, 1.06, 1],
  });
  const scaleX = hop.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1.08, 0.96, 1],
  });

  // Shadow shrinks as the animal rises
  const shadowScale = hop.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.5],
  });
  const shadowOpacity = hop.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.05],
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.stage}>
        <Animated.Text
          style={[
            styles.emoji,
            {
              transform: [{ translateY }, { scaleX }, { scaleY }],
            },
          ]}
        >
          {ANIMALS[index]}
        </Animated.Text>

        <Animated.View
          style={[
            styles.shadow,
            {
              opacity: shadowOpacity,
              transform: [
                { scaleX: shadowScale },
                { scaleY: shadowScale },
              ],
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 96,
    width: 100,
  },
  emoji: {
    fontSize: 56,
    lineHeight: 64,
    textAlign: 'center',
  },
  shadow: {
    width: 44,
    height: 6,
    borderRadius: 22,
    backgroundColor: '#000',
    marginTop: 6,
  },
});