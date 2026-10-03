import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../theme/fonts';
import { colors } from '../theme/colors';
import BrandLogo from '../components/BrandLogo';
import ScreenBackground from '../components/ScreenBackground';

export default function LandingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return <View style={styles.container}>
    <ScreenBackground />
    <ScrollView contentContainerStyle={[styles.content, {paddingTop:insets.top + 16,paddingBottom:insets.bottom + 20}]} showsVerticalScrollIndicator={false}>
      <BrandLogo width={180} />
      <Text accessibilityRole="header" style={styles.title}>Your smile, in good hands.</Text>
      <Text style={styles.description}>Your dental care, all in one place.</Text>
      <TouchableOpacity accessibilityRole="button" style={styles.primary} onPress={() => navigation.replace('Login')}><Text style={styles.primaryText}>Sign in</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={styles.secondary} onPress={() => navigation.navigate('Register')}><Text style={styles.secondaryText}>Create an account</Text></TouchableOpacity>
    </ScrollView>
  </View>;
}
const styles=StyleSheet.create({
 container:{flex:1,backgroundColor:colors.canvas},
 content:{flexGrow:1,justifyContent:'center',paddingHorizontal:24,maxWidth:600,width:'100%',alignSelf:'center'},
 eyebrow:{fontFamily:fonts.semiBold,fontSize:10,letterSpacing:1,color:colors.accent,marginTop:18},
 title:{fontFamily:fonts.bold,fontSize:32,lineHeight:39,color:colors.ink,marginTop:8},
 description:{fontFamily:fonts.regular,fontSize:14,lineHeight:21,color:colors.muted,marginTop:10,marginBottom:16},
 entry:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:18,padding:16},
 sectionTitle:{fontFamily:fonts.semiBold,fontSize:16,color:colors.ink},
 hint:{fontFamily:fonts.regular,fontSize:12,lineHeight:18,color:colors.muted,marginTop:4,marginBottom:12},
 primary:{minHeight:48,borderRadius:14,backgroundColor:colors.primary,padding:12,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:10},
 primaryText:{fontFamily:fonts.bold,fontSize:14,color:colors.ink},
 secondary:{minHeight:46,marginTop:10,borderRadius:14,borderWidth:1,borderColor:colors.border,justifyContent:'center',alignItems:'center',padding:10},
 secondaryText:{fontFamily:fonts.semiBold,fontSize:13,color:colors.accent,textAlign:'center'},
});
