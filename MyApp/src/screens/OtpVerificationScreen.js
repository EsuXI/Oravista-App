import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";
import { API_BASE_URL } from "../config/config";
import CustomAlertModal from "../components/CustomAlertModal";

export default function OtpVerificationScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const email = route?.params?.email || "your email";
  const user = route?.params?.user || null;
  const isChangePasswordFlow = route?.params?.isChangePasswordFlow || false;
  const isResetFlow = route?.params?.isResetFlow || false;
  const newPassword = route?.params?.newPassword || null;
  const initialOtp = route?.params?.challengeId || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(initialOtp ? 30 : 0);
  const [currentOtp, setCurrentOtp] = useState(initialOtp);

  // Custom Alert Modal State
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: "error",
    title: "",
    message: "",
    onPrimaryPress: () => {},
  });

  const inputs = useRef([]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (text, index) => {
    if (text.length === 6 && /^\d+$/.test(text)) {
      const newOtp = text.split("");
      setOtp(newOtp);
      inputs.current[5]?.focus();
      return;
    }

    const cleanChar = text.replace(/[^0-9]/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleanChar;
    setOtp(newOtp);

    if (cleanChar && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace") {
      if (otp[index] === "" && index > 0) {
        inputs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
      }
    }
  };

  const handleVerify = async () => {
    if (loading) return;
    const code = otp.join("");
    if (code.length !== 6) {
      setAlertConfig({
        visible: true,
        type: "warning",
        title: "Incomplete Code",
        message: "Please enter the complete 6-digit verification code.",
        onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/verify-otp`, {
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,challengeId:currentOtp,code}),
      });
      const verified = await response.json();
      if (!response.ok) throw new Error(verified.message || 'Verification failed.');
      if (isResetFlow) {
        if (!verified.verificationToken) throw new Error('Please request a new recovery code.');
        navigation.replace('ResetPassword',{email:email.trim().toLowerCase(),verificationToken:verified.verificationToken});
      } else if (isChangePasswordFlow) {
        const changed = await fetch(`${API_BASE_URL}/api/update-password`,{
          method:'PUT',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({id:user?.id || user?.user_id,oldPassword:route?.params?.oldPassword,newPassword,verificationToken:verified.verificationToken}),
        });
        const result=await changed.json();if(!changed.ok) throw new Error(result.message || 'Password update failed. Request another code.');
        if(result.token) await AsyncStorage.setItem('userToken',result.token);
        setAlertConfig({visible:true,type:'success',title:'Password Updated',message:'Your password has been changed.',onPrimaryPress:()=>navigation.reset({index:0,routes:[{name:'Home'}]})});
      } else {
        if(!verified.token || !verified.user?.id || verified.user.role !== 'patient') throw new Error('Please sign in with a patient account.');
        await AsyncStorage.setItem('userToken',verified.token);
        await AsyncStorage.setItem('userData',JSON.stringify(verified.user));
        await AsyncStorage.setItem('userEmail',email);
        navigation.reset({index:0,routes:[{name:'Home'}]});
      }
    } catch(error) {
      setAlertConfig({visible:true,type:'error',title:'Verification Failed',message:error.message || 'Please try again.',onPrimaryPress:()=>setAlertConfig(prev=>({...prev,visible:false}))});
    } finally {setLoading(false);}
  };

  const handleResend = async () => {
    if (loading || resendCooldown > 0) return;
    setLoading(true);
    setOtp(["", "", "", "", "", ""]);

    try {
      let actionType = "login";
      if (isChangePasswordFlow) actionType = "change_password";
      if (isResetFlow) actionType = "forgot_password";

      const response = await fetch(`${API_BASE_URL}/api/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          action: actionType,
          challengeId: currentOtp,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        if (!data.challengeId) {
          setCurrentOtp("");
          setAlertConfig({
            visible: true,
            type: "error",
            title: "Resend Failed",
            message: "The server did not return a verification code. Please try again.",
            onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
          });
          return;
        }
        setCurrentOtp(data.challengeId);
        setOtp(["", "", "", "", "", ""]);
        setResendCooldown(30);
        setAlertConfig({
          visible: true,
          type: "success",
          title: "Code Sent",
          message: "A new 6-digit verification code has been sent to your email.",
          onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
        });
      } else {
        setAlertConfig({
          visible: true,
          type: "error",
          title: "Resend Failed",
          message: data.message || "Could not resend code.",
          onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
        });
      }
    } catch (err) {
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Error",
        message: "Network error while resending verification code.",
        onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScreenBackground />
      <View style={[styles.premiumHeader, { paddingTop: insets.top + 20, overflow: "hidden" }]}><ScreenBackground header />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" style={[styles.backBtn, { top: insets.top + 12, minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={32} color={colors.accent} />
        </View>
        <Text style={styles.title}>Enter 6-Digit Code</Text>
        <Text style={styles.subtitle}>{currentOtp ? `Sent to ${email}` : "Your email code hasn't been sent yet."}</Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {!currentOtp && <Text accessibilityLiveRegion="polite" style={styles.deliveryNotice}>{loading ? 'Requesting your code…' : (route?.params?.deliveryError || 'Try Resend Code. If sending keeps failing, contact the clinic for help.')}</Text>}
        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputs.current[index] = ref)}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              keyboardType="number-pad"
              maxLength={6}
              accessibilityLabel={`Verification code digit ${index + 1}`}
              textContentType="oneTimeCode"
              editable={!loading && !!currentOtp}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
            />
          ))}
        </View>

        <TouchableOpacity accessibilityRole="button" style={[styles.verifyBtn, (loading || !currentOtp || otp.join('').length !== 6) && { opacity: 0.5 }]} onPress={handleVerify} disabled={loading || !currentOtp || otp.join('').length !== 6}>
          {loading ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <Text style={styles.verifyText}>Verify & Proceed</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendRow}>
          <Text style={styles.resendPrompt}>Didn't receive the code? </Text>
          <TouchableOpacity accessibilityRole="button" onPress={handleResend} disabled={loading || resendCooldown > 0}>
            <Text style={[styles.resendLink, resendCooldown > 0 && styles.resendDisabled]}>
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CustomAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onPrimaryPress={alertConfig.onPrimaryPress}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  premiumHeader: {
    backgroundColor: colors.primary,
    paddingTop: 55,
    paddingBottom: 40,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    alignItems: "center",
    position: "relative",
  },
  backBtn: {
    position: "absolute",
    left: 20,
    top: 55,
    padding: 4,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.ink,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.muted,
    marginTop: 4,
  },
  content: {
    padding: 16,
    alignItems: "center",
    paddingTop: 32,
  },
  deliveryNotice: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 21, color: colors.danger, backgroundColor: colors.dangerSoft, padding: 14, borderRadius: 20, marginBottom: 16, width: '100%' },
  otpRow: {
    gap: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 32,
  },
  otpBox: {
    flex: 1,
    minWidth: 0,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    textAlign: "center",
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.ink,
    backgroundColor: colors.input,
  },
  otpBoxFilled: {
    borderColor: colors.accent,
    backgroundColor: colors.lavender,
  },
  verifyBtn: {
    backgroundColor: colors.primary,
    width: "100%",
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  verifyText: {
    color: colors.ink,
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  resendRow: {
    flexWrap: 'wrap',
    justifyContent: 'center',
    flexDirection: "row",
    alignItems: "center",
  },
  resendPrompt: {
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.regular,
  },
  resendLink: {
    fontSize: 14,
    color: colors.accent,
    fontFamily: fonts.semiBold,
  },
  resendDisabled: {
    color: colors.muted,
  },
});
