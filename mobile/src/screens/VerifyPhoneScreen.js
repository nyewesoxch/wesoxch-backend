import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function VerifyPhoneScreen({ route, navigation }) {
  const { phone, otpHint } = route.params;
  const { setUser } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [resending, setResending] = useState(false);
  const inputs = useRef([]);

  useEffect(() => {
    const timer = setInterval(() => setCountdown(p => p > 0 ? p - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto fill if hint provided (local testing)
  useEffect(() => {
    if (otpHint && otpHint.length === 6) {
      setOtp(otpHint.split(''));
    }
  }, [otpHint]);

  const handleChange = (text, index) => {
    const clean = text.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = clean;
    setOtp(newOtp);
    setError('');
    if (clean && index < 5) inputs.current[index + 1]?.focus();
    if (newOtp.every(d => d !== '')) verify(newOtp.join(''));
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const verify = async (code) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/verify-otp', { phone, otp: code });

      if (res.data.is_new_user) {
        navigation.navigate('SetupProfile', { phone });
        return;
      }

      await SecureStore.setItemAsync('wesoxch_token', res.data.token);
      setUser(res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Wrong code. Try again.');
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      const res = await api.post('/auth/resend-otp', { phone });
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      setError('');
      if (res.data.otp_hint) setOtp(res.data.otp_hint.split(''));
    } catch {
      setError('Could not resend. Try again.');
    } finally {
      setResending(false); }
  };

  const maskedPhone = phone.replace(/(\+254)(\d{3})(\d{3})(\d{3})/, '$1 $2 *** $4');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>Enter the code</Text>
          <Text style={styles.subtitle}>
            Sent to {maskedPhone}
          </Text>

          {otpHint && (
            <View style={styles.hintBox}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.hintText}>Test mode — code: <Text style={styles.hintCode}>{otpHint}</Text></Text>
            </View>
          )}
        </View>

        <View style={styles.otpSection}>
          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={ref => inputs.current[i] = ref}
                style={[styles.otpBox, digit && styles.otpBoxFilled, error && styles.otpBoxError]}
                value={digit}
                onChangeText={t => handleChange(t, i)}
                onKeyPress={e => handleKeyPress(e, i)}
                keyboardType="numeric"
                maxLength={1}
                selectTextOnFocus
                autoFocus={i === 0}
              />
            ))}
          </View>

          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Verifying...</Text>
            </View>
          )}
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity
            style={[styles.btn, (otp.some(d => !d) || loading) && styles.btnDisabled]}
            onPress={() => verify(otp.join(''))}
            disabled={otp.some(d => !d) || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Verify</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendRow}
            onPress={handleResend}
            disabled={countdown > 0 || resending}
          >
            {resending
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>
                  {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
                </Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, padding: 24, justifyContent: 'space-between' },
  backBtn: { marginBottom: 32 },
  iconWrap: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '600', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.muted, lineHeight: 24 },
  hintBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface, borderRadius: 8,
    padding: 12, marginTop: 16,
    borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  hintText: { fontSize: 13, color: colors.muted },
  hintCode: { fontWeight: '700', color: colors.text, letterSpacing: 2 },
  otpSection: { gap: 16, alignItems: 'center' },
  otpRow: { flexDirection: 'row', gap: 10 },
  otpBox: {
    width: 48, height: 56, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: colors.surface,
    textAlign: 'center', fontSize: 22,
    fontWeight: '600', color: colors.text,
  },
  otpBoxFilled: { borderColor: colors.primary, backgroundColor: colors.background },
  otpBoxError: { borderColor: colors.danger },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { fontSize: 14, color: colors.danger },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 14, color: colors.muted },
  bottom: { gap: 16 },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 8, paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resendRow: { alignItems: 'center', paddingVertical: 8 },
  resendText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
  resendDisabled: { color: colors.muted },
});
