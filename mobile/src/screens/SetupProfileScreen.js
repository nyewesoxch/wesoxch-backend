import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, StatusBar, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const SITE = 'https://nyewesoxch.github.io';
const openPage = (path) =>
  Linking.openURL(SITE + path).catch(() => Alert.alert('Could not open the page', SITE + path));

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
  const { phone, signupToken } = route.params;
  const { setUser } = useAuth();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [adult, setAdult] = useState(false);
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
    if (!adult) e.adult = 'Please confirm that you are 18 or older';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/complete-profile', {
        signup_token: signupToken,
        full_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        adult_confirmed: true,
      });
      await SecureStore.setItemAsync('wesoxch_token', res.data.token);
      setUser(res.data.user);
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not save your profile. Check your connection and try again.';
      if (err.response?.status === 409 && /username/i.test(msg)) {
        setErrors(e => ({ ...e, username: 'That username is already taken' }));
      } else {
        Alert.alert('Sorry, that did not work', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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

          <View>
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => { setAdult(v => !v); clearError('adult'); }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: adult }}
              accessibilityLabel="I am 18 or older, and I agree to the Terms and the Privacy Policy"
            >
              <Ionicons name={adult ? 'checkbox' : 'square-outline'} size={28} color={errors.adult ? colors.danger : colors.primary} />
              <Text style={styles.checkText}>
                I am 18 or older, and I agree to the{' '}
                <Text style={styles.link} onPress={() => openPage('/terms.html')}>Terms</Text> and the{' '}
                <Text style={styles.link} onPress={() => openPage('/privacy.html')}>Privacy Policy</Text>.
              </Text>
            </TouchableOpacity>
            {errors.adult ? <Text style={styles.fieldError}>{errors.adult}</Text> : null}
          </View>
        </View>

        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Join Wesoxch</Text>}
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
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: colors.text, backgroundColor: colors.background },
  inputError: { borderColor: colors.danger },
  fieldError: { fontSize: 13, color: colors.danger, marginTop: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 44 },
  checkText: { flex: 1, fontSize: 14, lineHeight: 22, color: colors.text },
  link: { color: colors.primary, textDecorationLine: 'underline' },
  btn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
