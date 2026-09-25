import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../theme/fonts';
import { colors } from '../theme/colors';
import BrandLogo from '../components/BrandLogo';
import ScreenBackground from '../components/ScreenBackground';

export default function LandingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <ScreenBackground />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 20 }}>
        <View style={[styles.hero, { paddingTop: insets.top + 24 }]}>
          <View style={styles.smileCard}>
            <View style={styles.symbolCircle}><BrandLogo variant="symbol" width={112} /></View>
            <Text style={styles.cardTitle}>A little care, every day.</Text>
            <Text style={styles.cardCaption}>Your next healthy smile starts here.</Text>
            <View style={styles.clinicBadge}><Ionicons name="medical-outline" size={15} color={colors.ink} /><Text style={styles.clinicText}>KING EPRES DENTAL CLINIC</Text></View>
          </View>
        </View>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>A LITTLE CARE. A HEALTHIER SMILE.</Text>
          <Text accessibilityRole="header" style={styles.title}>Your smile,{'\n'}our priority.</Text>
          <Text style={styles.description}>Your dental care, close at hand. Plan your next visit and keep your appointments and records in one place.</Text>
          <View style={styles.features}>
            {[['calendar-outline', 'Visits'], ['document-text-outline', 'Records'], ['heart-outline', 'Care']].map(([icon, label], i) => <View key={label} style={[styles.feature, { backgroundColor: [colors.aquaSoft, colors.lavender, colors.peach][i] }]}><Ionicons name={icon} size={18} color={colors.ink} /><Text style={styles.featureText}>{label}</Text></View>)}
          </View>
          <TouchableOpacity accessibilityRole="button" style={styles.primary} activeOpacity={0.8} onPress={() => navigation.replace('Login')}><Text style={styles.primaryText}>Log in to your account</Text><Ionicons name="arrow-forward" size={20} color={colors.ink} /></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.secondary} activeOpacity={0.8} onPress={() => navigation.navigate('Register')}><Text style={styles.secondaryText}>New here? Create an account</Text></TouchableOpacity>
          <Text style={styles.footer}>Thoughtful care, from your first visit.</Text>
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  hero: { paddingHorizontal: 24, alignItems: 'center', maxWidth: 540, width: '100%', alignSelf: 'center' },
  smileCard: { width: '100%', padding: 22, borderRadius: 32, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  symbolCircle: { backgroundColor: colors.aquaSoft, width: 126, height: 126, borderRadius: 63, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  cardTitle: { fontFamily: fonts.semiBold, fontSize: 18, color: colors.ink, textAlign: 'center' },
  cardCaption: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  clinicBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'center', flexShrink: 1 },
  clinicText: { fontFamily: fonts.semiBold, fontSize: 9, letterSpacing: 0.6, color: colors.ink },
  content: { padding: 24, maxWidth: 540, width: '100%', alignSelf: 'center' },
  eyebrow: { color: colors.accent, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.2, marginBottom: 10 },
  title: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 43, color: colors.ink, letterSpacing: -1 },
  description: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 23, color: colors.muted, marginTop: 12 },
  features: { flexDirection: 'row', gap: 8, marginVertical: 24 },
  feature: { flex: 1, borderRadius: 18, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  featureText: { fontFamily: fonts.semiBold, color: colors.ink, fontSize: 12 },
  primary: { minHeight: 56, padding: 16, borderRadius: 999, backgroundColor: colors.primary, flexDirection: 'row', gap: 12, justifyContent: 'center', alignItems: 'center' },
  primaryText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, flexShrink: 1, textAlign: 'center' },
  secondary: { minHeight: 52, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: 12, padding: 12 },
  secondaryText: { color: colors.accent, fontFamily: fonts.semiBold, fontSize: 13, textAlign: 'center' },
  footer: { textAlign: 'center', fontFamily: fonts.regular, color: colors.muted, fontSize: 11, marginTop: 22 },
});
