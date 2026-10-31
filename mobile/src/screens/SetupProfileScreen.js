import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
  StatusBar, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

// Defined outside the screen so the text box keeps focus while typing
function Field({ label, error, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor={colors.muted}
        {...props}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export default function SetupProfileScreen({ route }) {
  const { phone } = route.params;
  const { setUser } = useAuth();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const clearError = (key) => {
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    const u = username.trim();
    if (!fullName.trim()) e.fullName = 'Your name is required';
    if (!u) e.username = 'Choose a username';
    else if (u.length < 3) e.username = 'Username must be at least 3 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(u)) e.username = 'Letters, numbers and underscores only';
    if (!age) e.age = 'Your age is required';
    else if (parseInt(age) < 13) e.age = 'You must be at least 13 years old';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/complete-profile', {
        phone,
        full_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        age: parseInt(age),
      });
      await SecureStore.setItemAsync('wesoxch_token', res.data.token);
      setUser(res.data.user);
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not save profile.';
      if (msg.toLowerCase().includes('username')) {
        setErrors(e => ({ ...e, username: 'This username is taken' }));
      } else {
        Alert.alert('Something went wrong', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.subtitle}>Tell the community a little about yourself.</Text>

        <View style={styles.form}>
          <Field
            label="Your full name"
            value={fullName}
            onChangeText={t => { setFullName(t); clearError('fullName'); }}
            error={errors.fullName}
            placeholder="e.g. Atieno Ochieng"
            autoCapitalize="words"
          />
          <Field
            label="Username"
            value={username}
            onChangeText={t => { setUsername(t); clearError('username'); }}
            error={errors.username}
            placeholder="e.g. atieno_k"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Field
            label="Your age"
            value={age}
            onChangeText={t => { setAge(t); clearError('age'); }}
            error={errors.age}
            placeholder="e.g. 24"
            keyboardType="numeric"
            maxLength={3}
          />
          <Text style={styles.ageNote}>You must be at least 13 to use Wesoxch.</Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Join Wesoxch</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 16 },
  subtitle: { fontSize: 16, color: colors.muted, lineHeight: 24, marginBottom: 32 },
  form: { gap: 20, marginBottom: 32 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: colors.text },
  input: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 14, fontSize: 16,
    color: colors.text, backgroundColor: colors.background,
  },
  inputError: { borderColor: colors.danger },
  fieldError: { fontSize: 13, color: colors.danger },
  ageNote: { fontSize: 13, color: colors.muted, marginTop: -8 },
  btn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
