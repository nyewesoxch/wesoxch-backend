import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import * as SecureStore from 'expo-secure-store';

const COCOA = '#7B4F2E';

export default function VerifyOTPScreen({ route, navigation }) {
  const { email } = route.params;
  const { setUser } = useAuth();
  const [otp, setOtp] = useState(['','','','','','']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef([]);

  useEffect(() => {
    const timer = setInterval(() => setCountdown(prev => prev > 0 ? prev - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (text, index) => {
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
    setResending(true);
    try {
      await api.post('/auth/resend-otp', { email });
      Alert.alert('Code sent!', 'A new code has been sent to your email.');
      setCountdown(60);
      setOtp(['','','','','','']);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not resend code.');
    } finally { setResending(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <Text style={styles.logo}>🌍 Wesoxch</Text>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>We sent a 6-digit code to</Text>
        <Text style={styles.email}>{email}</Text>
        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput key={index} ref={ref => inputs.current[index] = ref}
              style={[styles.otpInput, digit && styles.otpInputFilled]}
              value={digit} onChangeText={text => handleOtpChange(text.replace(/[^0-9]/g,''), index)}
              onKeyPress={e => handleKeyPress(e, index)} keyboardType="numeric" maxLength={1} selectTextOnFocus autoFocus={index === 0} />
          ))}
        </View>
        {loading && <ActivityIndicator color="#22C55E" style={{ marginBottom: 12 }} />}
        <TouchableOpacity style={styles.verifyBtn} onPress={() => handleVerify(otp.join(''))} disabled={loading || otp.some(d => !d)}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyBtnText}>Verify Email</Text>}
        </TouchableOpacity>
        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't get the code? </Text>
          <TouchableOpacity onPress={handleResend} disabled={countdown > 0 || resending}>
            {resending ? <ActivityIndicator color={COCOA} size="small" /> : <Text style={[styles.resendBtn, countdown > 0 && { color: '#475569' }]}>{countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}</Text>}
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { flex: 1, justifyContent: 'center', padding: 24, alignItems: 'center' },
  logo: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#94A3B8' },
  email: { fontSize: 14, color: '#22C55E', fontWeight: '600', marginTop: 4, marginBottom: 32 },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  otpInput: { width: 48, height: 56, borderRadius: 12, borderWidth: 2, borderColor: '#334155', backgroundColor: '#1E293B', textAlign: 'center', fontSize: 24, fontWeight: '700', color: '#fff' },
  otpInputFilled: { borderColor: '#22C55E' },
  verifyBtn: { backgroundColor: COCOA, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 48, alignItems: 'center', width: '100%', marginBottom: 20 },
  verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  resendLabel: { color: '#94A3B8', fontSize: 14 },
  resendBtn: { color: COCOA, fontSize: 14, fontWeight: '600' },
  backText: { color: '#64748B', fontSize: 14, marginTop: 8 },
});
