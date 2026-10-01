import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../api/client';

const COCOA = '#7B4F2E';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email) { Alert.alert('Required', 'Please enter your email'); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      Alert.alert('Code Sent!', 'Check your email for a 6-digit reset code.');
      setStep(2);
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Could not send code'); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!otp || !newPassword || !confirmPassword) { Alert.alert('Required', 'Fill in all fields'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Mismatch', 'Passwords do not match'); return; }
    if (newPassword.length < 6) { Alert.alert('Too short', 'Min 6 characters'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email: email.trim().toLowerCase(), otp: otp.trim(), new_password: newPassword });
      Alert.alert('Password Reset!', 'You can now log in.', [{ text: 'Log In', onPress: () => navigation.navigate('Login') }]);
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Could not reset password'); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <Text style={styles.logo}>🌍 Wesoxch</Text>
        <Text style={styles.title}>{step === 1 ? 'Forgot Password?' : 'Reset Password'}</Text>
        <Text style={styles.subtitle}>{step === 1 ? "Enter your email and we'll send a reset code." : `Enter the code sent to ${email} and your new password.`}</Text>
        {step === 1 ? (
          <>
            <TextInput style={styles.input} placeholder="Your email" placeholderTextColor="#888" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <TouchableOpacity style={styles.button} onPress={handleSendCode} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Code</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput style={styles.input} placeholder="6-digit code" placeholderTextColor="#888" value={otp} onChangeText={setOtp} keyboardType="numeric" maxLength={6} />
            <TextInput style={styles.input} placeholder="New password (min 6 chars)" placeholderTextColor="#888" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <TextInput style={styles.input} placeholder="Confirm new password" placeholderTextColor="#888" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
            <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSendCode} style={{ marginTop: 12 }}>
              <Text style={{ color: COCOA, textAlign: 'center' }}>Resend code</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 24 }}>
          <Text style={styles.backText}>← Back to Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  input: { backgroundColor: '#1E293B', color: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: '#334155' },
  button: { backgroundColor: COCOA, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backText: { color: '#64748B', fontSize: 14, textAlign: 'center' },
});
