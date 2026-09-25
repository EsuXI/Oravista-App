import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

export default function LoadError({ message, onRetry }) {
  return <View style={{ padding: 20, margin: 16, borderRadius: 24, backgroundColor: colors.surface }}>
    <Text accessibilityRole="alert" style={{ color: colors.ink, fontFamily: fonts.medium, textAlign: 'center' }}>{message}</Text>
    <TouchableOpacity accessibilityRole="button" onPress={onRetry} style={{ marginTop: 14, padding: 14, borderRadius: 999, backgroundColor: colors.primary, alignItems: 'center' }}>
      <Text style={{ color: colors.ink, fontFamily: fonts.bold }}>Try again</Text>
    </TouchableOpacity>
  </View>;
}
