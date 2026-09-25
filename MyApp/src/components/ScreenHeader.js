import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../theme/fonts';
import { colors } from '../theme/colors';
import BrandLogo from './BrandLogo';
import ScreenBackground from './ScreenBackground';

export default function ScreenHeader({ title, showBack = false, rightIcon, onRightPress, rightAccessibilityLabel = 'More options' }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
      <ScreenBackground header />
      <View style={styles.row}>
        {showBack ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.iconButton}><Ionicons name="arrow-back" size={23} color={colors.ink} /></TouchableOpacity> : <BrandLogo variant="symbol" width={44} />}
        <View style={styles.titles}>
          <Text style={styles.eyebrow}>YOUR SMILE, OUR PRIORITY</Text>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        </View>
        {rightIcon && <TouchableOpacity accessibilityRole="button" accessibilityLabel={rightAccessibilityLabel} disabled={!onRightPress} onPress={onRightPress} style={styles.iconButton}><Ionicons name={rightIcon} size={23} color={colors.ink} /></TouchableOpacity>}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titles: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.ink, fontFamily: fonts.semiBold, fontSize: 9, letterSpacing: 1.1, marginBottom: 4 },
  title: { color: colors.ink, fontFamily: fonts.bold, fontSize: 21, lineHeight: 29 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#B8EAF099' },
});
