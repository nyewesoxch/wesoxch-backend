import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import api from '../api/client';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email) { Alert.alert('Required', 'Enter your email'); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setStep(2);
    } catch { Alert.alert('Error', 'Could not send code'); }
    finally { setLoading(false); }
  };

  const handleReset = async () => {
    if (!otp || !newPass || !confirmPass) { Alert.alert('Required', 'Fill all fields'); return; }
    if (newPass !== confirmPass) { Alert.alert('Mismatch', 'Passwords do not match'); return; }
    if (newPass.length < 6) { Alert.alert('Too short', 'Min 6 characters'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email: email.trim().toLowerCase(), otp: otp.trim(), new_password: newPass });
      Alert.alert('Done!', 'Password reset successfully.', [{ text: 'Log In', onPress: () => navigation.navigate('Login') }]);
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Could not reset'); }
    finally { setLoading(false); }
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
          <Ionicons name="key-outline" size={40} color={colors.amber} />
        </View>
        <Text style={styles.title}>{step === 1 ? 'Forgot Password?' : 'Reset Password'}</Text>
        <Text style={styles.subtitle}>{step === 1 ? "Enter your email and we'll send a code." : `Enter the code sent to ${email}`}</Text>
        <View style={styles.form}>
          {step === 1 ? (
            <>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Email address" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              </View>
              <TouchableOpacity style={styles.btn} onPress={handleSend} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Reset Code</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inputWrapper}>
                <Ionicons name="keypad-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="6-digit code" placeholderTextColor={colors.textMuted} value={otp} onChangeText={setOtp} keyboardType="numeric" maxLength={6} />
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="New password" placeholderTextColor={colors.textMuted} value={newPass} onChangeText={setNewPass} secureTextEntry />
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Confirm password" placeholderTextColor={colors.textMuted} value={confirmPass} onChangeText={setConfirmPass} secureTextEntry />
              </View>
              <TouchableOpacity style={styles.btn} onPress={handleReset} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Reset Password</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSend} style={styles.resendBtn}>
                <Text style={styles.resendText}>Resend code</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: 24, paddingTop: 60 },
  backBtn: { marginBottom: 32 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(245,158,11,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 32, lineHeight: 22 },
  form: { gap: 12 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgElevated, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: colors.textPrimary, paddingVertical: 16, fontSize: 15 },
  btn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendBtn: { alignItems: 'center' },
  resendText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});
