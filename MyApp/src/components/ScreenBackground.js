import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

// Native decoration: no network images, touch interception or extra dependencies.
export default function ScreenBackground({ header = false }) {
  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFillObject, styles.clip]}>
      <View style={[styles.aqua, header && styles.headerAqua]} />
      <View style={[styles.ring, header && styles.headerRing]} />
      {!header && <View style={styles.lavender} />}
      {!header && <View style={styles.peach} />}
    </View>
  );
}
const styles = StyleSheet.create({
  clip: { overflow: 'hidden', borderRadius: 0 },
  aqua: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: colors.aquaSoft, right: -160, top: 100, opacity: 0.6 },
  ring: { position: 'absolute', width: 310, height: 310, borderRadius: 155, borderWidth: 36, borderColor: colors.surface, left: -180, top: 260, opacity: 0.45 },
  lavender: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: colors.lavender, left: -150, bottom: -60, opacity: 0.45 },
  peach: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: colors.peach, right: -100, bottom: 120, opacity: 0.4 },
  headerAqua: { top: -140, right: -80, opacity: 0.35 },
  headerRing: { width: 230, height: 230, borderRadius: 115, borderWidth: 25, top: -120, left: -90, opacity: 0.25 },
});
