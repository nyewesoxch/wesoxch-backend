import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import api from '../api/client';

const genChallenge = () => { const a = Math.floor(Math.random()*9)+1; const b = Math.floor(Math.random()*9)+1; return { question: `${a} + ${b}`, answer: (a+b).toString() }; };

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [mathAnswer, setMathAnswer] = useState('');
  const [challenge, setChallenge] = useState(genChallenge());
  const [loading, setLoading] = useState(false);

  const refresh = () => { setChallenge(genChallenge()); setMathAnswer(''); };

  const handleRegister = async () => {
    if (!fullName || !username || !email || !password) { Alert.alert('Missing fields', 'Fill in all fields'); return; }
    if (password.length < 6) { Alert.alert('Weak password', 'Min 6 characters'); return; }
    if (!age || parseInt(age) < 13) { Alert.alert('Invalid age', 'Must be 13+'); return; }
    if (mathAnswer.trim() !== challenge.answer) { Alert.alert('Wrong answer', `${challenge.question} = ${challenge.answer}`); refresh(); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { username: username.trim(), email: email.trim(), password, full_name: fullName.trim(), age: parseInt(age) });
      if (res.data.requires_verification) {
        navigation.navigate('VerifyOTP', { email: res.data.email || email.trim().toLowerCase(), otpHint: res.data.otp_hint });
      }
    } catch (err) {
      Alert.alert('Registration failed', err.response?.data?.message || 'Check your connection.');
      refresh();
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[colors.primaryDark, colors.bg, colors.bg]} style={StyleSheet.absoluteFill} locations={[0, 0.3, 1]} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join your community today</Text>
        </View>
        <View style={styles.form}>
          {[
            { value: fullName, setter: setFullName, placeholder: 'Full name', icon: 'person-outline' },
            { value: username, setter: setUsername, placeholder: 'Username', icon: 'at-outline', autoCapitalize: 'none' },
            { value: email, setter: setEmail, placeholder: 'Email address', icon: 'mail-outline', autoCapitalize: 'none', keyboardType: 'email-address' },
            { value: password, setter: setPassword, placeholder: 'Password (min 6)', icon: 'lock-closed-outline', secureTextEntry: true },
            { value: age, setter: setAge, placeholder: 'Age (13+)', icon: 'calendar-outline', keyboardType: 'numeric', maxLength: 3 },
          ].map((field, i) => (
            <View key={i} style={styles.inputWrapper}>
              <Ionicons name={field.icon} size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textMuted}
                value={field.value}
                onChangeText={field.setter}
                autoCapitalize={field.autoCapitalize || 'words'}
                keyboardType={field.keyboardType || 'default'}
                secureTextEntry={field.secureTextEntry || false}
                maxLength={field.maxLength}
              />
            </View>
          ))}
          <View style={styles.challengeBox}>
            <Text style={styles.challengeLabel}>Prove you're human 🤖</Text>
            <View style={styles.challengeRow}>
              <View style={styles.challengeQ}>
                <Text style={styles.challengeText}>What is {challenge.question}?</Text>
              </View>
              <TouchableOpacity onPress={refresh} style={styles.refreshBtn}>
                <Ionicons name="refresh" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="calculator-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Your answer" placeholderTextColor={colors.textMuted} value={mathAnswer} onChangeText={setMathAnswer} keyboardType="numeric" maxLength={3} />
            </View>
          </View>
          <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerBtnText}>Create Account</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>Already have an account? <Text style={{ color: colors.primary }}>Log in</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, padding: 24 },
  header: { marginTop: 60, marginBottom: 32 },
  backBtn: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 15, color: colors.textSecondary },
  form: { gap: 12 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgElevated, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: colors.textPrimary, paddingVertical: 16, fontSize: 15 },
  challengeBox: { backgroundColor: colors.bgElevated, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 10 },
  challengeLabel: { color: colors.textSecondary, fontSize: 13 },
  challengeRow: { flexDirection: 'row', gap: 8 },
  challengeQ: { flex: 1, backgroundColor: colors.bgInput, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.primary },
  challengeText: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  refreshBtn: { backgroundColor: colors.bgInput, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  registerBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  registerBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginLink: { alignItems: 'center' },
  loginLinkText: { color: colors.textSecondary, fontSize: 14 },
});
