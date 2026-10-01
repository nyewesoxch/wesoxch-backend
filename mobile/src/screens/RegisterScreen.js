import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import api from '../api/client';

const COCOA = '#7B4F2E';
const genChallenge = () => { const a = Math.floor(Math.random()*9)+1; const b = Math.floor(Math.random()*9)+1; return { question: `${a} + ${b}`, answer: (a+b).toString() }; };

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
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
      if (res.data.requires_verification) navigation.navigate('VerifyOTP', { email: res.data.email || email.trim().toLowerCase() });
    } catch (err) {
      Alert.alert('Registration failed', err.response?.data?.message || 'Check your connection.');
      refresh();
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>🌍 Wesoxch</Text>
        <Text style={styles.subtitle}>Create your account</Text>
        <TextInput style={styles.input} placeholder="Full name *" placeholderTextColor="#888" value={fullName} onChangeText={setFullName} />
        <TextInput style={styles.input} placeholder="Username *" placeholderTextColor="#888" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Email *" placeholderTextColor="#888" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Password (min 6 characters) *" placeholderTextColor="#888" value={password} onChangeText={setPassword} secureTextEntry />
        <Text style={styles.label}>Your Age * (13+)</Text>
        <TextInput style={styles.input} placeholder="Enter your age" placeholderTextColor="#888" value={age} onChangeText={setAge} keyboardType="numeric" maxLength={3} />
        <Text style={styles.label}>🤖 Prove you're human</Text>
        <View style={styles.mathRow}>
          <View style={styles.mathQ}><Text style={styles.mathQText}>What is {challenge.question}?</Text></View>
          <TouchableOpacity onPress={refresh} style={styles.refreshBtn}><Text style={{ color: '#94A3B8', fontSize: 20 }}>↻</Text></TouchableOpacity>
        </View>
        <TextInput style={styles.input} placeholder="Your answer" placeholderTextColor="#888" value={mathAnswer} onChangeText={setMathAnswer} keyboardType="numeric" maxLength={3} />
        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Log in</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 24 },
  input: { backgroundColor: '#1E293B', color: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: '#334155' },
  label: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  mathRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  mathQ: { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COCOA },
  mathQText: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  refreshBtn: { backgroundColor: '#334155', borderRadius: 10, padding: 14 },
  button: { backgroundColor: COCOA, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#94A3B8', textAlign: 'center', marginTop: 20 },
  linkBold: { color: COCOA, fontWeight: '600' },
});
