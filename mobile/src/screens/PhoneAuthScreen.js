import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import api from '../api/client';

const formatPhone = (phone) => {
  phone = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (phone.startsWith('0')) return '+254' + phone.slice(1);
  if (phone.startsWith('254')) return '+' + phone;
  if (!phone.startsWith('+')) return '+254' + phone;
  return phone;
};

export default function PhoneAuthScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    setError('');
    if (!phone || phone.replace(/\D/g, '').length < 9) {
      setError('Enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/send-otp', { phone });
      navigation.navigate('VerifyPhone', {
        phone: res.data.phone,
        otpHint: res.data.otp_hint,
      });
    } catch (err) {
      setError(err.response?.data?.message || ('Could not reach the server (' + err.message + ')'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.top}>
          <View style={styles.iconWrap}>
            <Ionicons name="phone-portrait-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>What's your number?</Text>
          <Text style={styles.subtitle}>
            We'll send you a one-time code to verify it's you.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>🇰🇪 +254</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="712 345 678"
              placeholderTextColor={colors.muted}
              value={phone}
              onChangeText={t => { setPhone(t); setError(''); }}
              keyboardType="phone-pad"
              maxLength={12}
              autoFocus
            />
          </View>

          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.hint}>
            We support Safaricom, Airtel and Telkom numbers.
          </Text>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity
            style={[styles.btn, (!phone || loading) && styles.btnDisabled]}
            onPress={handleSend}
            disabled={!phone || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Send code</Text>
            }
          </TouchableOpacity>

          <Text style={styles.legal}>
            By continuing you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, padding: 24, justifyContent: 'space-between' },
  top: { paddingTop: 32 },
  iconWrap: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24, fontWeight: '600',
    color: colors.text, marginBottom: 8,
  },
  subtitle: {
    fontSize: 16, color: colors.muted,
    lineHeight: 24,
  },
  form: { gap: 12 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 8, overflow: 'hidden',
    backgroundColor: colors.background,
  },
  countryCode: {
    paddingHorizontal: 14, paddingVertical: 16,
    borderRightWidth: 1.5, borderRightColor: '#E5E7EB',
    backgroundColor: colors.surface,
  },
  countryCodeText: { fontSize: 15, color: colors.text, fontWeight: '500' },
  input: {
    flex: 1, fontSize: 16, color: colors.text,
    paddingHorizontal: 14, paddingVertical: 16,
    letterSpacing: 1,
  },
  errorRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6,
  },
  errorText: { fontSize: 14, color: colors.danger },
  hint: { fontSize: 13, color: colors.muted, lineHeight: 20 },
  bottom: { gap: 16 },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 8, paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  legal: {
    fontSize: 12, color: colors.muted,
    textAlign: 'center', lineHeight: 18,
  },
});
