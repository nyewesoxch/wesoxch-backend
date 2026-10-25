import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import * as SecureStore from 'expo-secure-store';

export default function VerifyOTPScreen({ route, navigation }) {
  const { email, otpHint } = route.params;
  const { setUser } = useAuth();
  const [otp, setOtp] = useState(['','','','','','']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef([]);

  useEffect(() => {
    const timer = setInterval(() => setCountdown(p => p > 0 ? p - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (otpHint && otpHint.length === 6) setOtp(otpHint.split(''));
  }, [otpHint]);

  const handleChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) inputs.current[index+1]?.focus();
    if (newOtp.every(d => d !== '')) handleVerify(newOtp.join(''));
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) inputs.current[index-1]?.focus();
  };

  const handleVerify = async (code) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, otp: code });
      await SecureStore.setItemAsync('wesoxch_token', res.data.token);
      setUser(res.data.user);
    } catch (err) {
      Alert.alert('Verification failed', err.response?.data?.message || 'Invalid code.');
      setOtp(['','','','','','']);
      inputs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      const res = await api.post('/auth/resend-otp', { email });
      setCountdown(60);
      setOtp(['','','','','','']);
      if (res.data.otp_hint) setOtp(res.data.otp_hint.split(''));
    } catch (err) { Alert.alert('Error', 'Could not resend code.'); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[colors.primaryDark, colors.bg, colors.bg]} style={StyleSheet.absoluteFill} locations={[0, 0.3, 1]} />
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.iconCircle}>
          <Ionicons name="mail-open-outline" size={40} color={colors.primary} />
        </View>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>We sent a code to</Text>
        <Text style={styles.email}>{email}</Text>
        {otpHint && (
          <View style={styles.hintBox}>
            <Text style={styles.hintLabel}>Your verification code</Text>
            <Text style={styles.hintCode}>{otpHint}</Text>
          </View>
        )}
        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={ref => inputs.current[i] = ref}
              style={[styles.otpBox, digit && styles.otpBoxFilled]}
              value={digit}
              onChangeText={text => handleChange(text.replace(/[^0-9]/g,''), i)}
              onKeyPress={e => handleKeyPress(e, i)}
              keyboardType="numeric"
              maxLength={1}
              selectTextOnFocus
              autoFocus={i === 0}
            />
          ))}
        </View>
        {loading && <ActivityIndicator color={colors.primary} style={{ marginBottom: 16 }} />}
        <TouchableOpacity style={styles.verifyBtn} onPress={() => handleVerify(otp.join(''))} disabled={loading || otp.some(d => !d)}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyBtnText}>Verify & Continue</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleResend} disabled={countdown > 0} style={styles.resendRow}>
          <Text style={styles.resendText}>
            {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: 24, paddingTop: 60 },
  backBtn: { marginBottom: 32 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(124,58,237,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)' },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 15, color: colors.textSecondary },
  email: { fontSize: 15, color: colors.primary, fontWeight: '600', marginBottom: 24 },
  hintBox: { backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  hintLabel: { color: colors.textSecondary, fontSize: 12, marginBottom: 8 },
  hintCode: { color: colors.green, fontSize: 36, fontWeight: '800', letterSpacing: 10 },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  otpBox: { flex: 1, height: 58, borderRadius: 12, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.bgElevated, textAlign: 'center', fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  otpBoxFilled: { borderColor: colors.primary, backgroundColor: 'rgba(124,58,237,0.1)' },
  verifyBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendRow: { alignItems: 'center' },
  resendText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});
