import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import api from '../api/client';

const REMOVED = [
  'Your profile and your profile picture',
  'Your listings, rentals and events, and their photos',
  'Your messages in communities and in Our Therapy',
  'Your community memberships and event replies',
];

export default function DeleteAccountScreen({ navigation }) {
  const { logout } = useAuth();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const ready = typed.trim().toUpperCase() === 'DELETE';

  const handleDelete = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      await api.post('/account/delete', { confirm: 'DELETE' });
      Alert.alert(
        'Your account has been deleted',
        'Everything you added has been removed. Thank you for being part of Wesoxch.',
        [{ text: 'OK', onPress: logout }],
        { cancelable: false }
      );
    } catch (e) {
      if (e.response?.status === 401) { await logout(); return; } // the account is already gone
      Alert.alert('Sorry, we could not delete your account', e.response?.data?.message || 'Check your connection and try again.');
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} disabled={busy} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete account</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>This permanently deletes your account. It cannot be undone.</Text>

        <Text style={styles.sectionTitle}>What we remove</Text>
        {REMOVED.map(line => (
          <View key={line} style={styles.bulletRow}>
            <View style={styles.bullet} />
            <Text style={styles.bulletText}>{line}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Communities you started</Text>
        <Text style={styles.body}>
          If other people have joined a community you started, it stays open and the member who has been there the longest
          becomes its admin. If you are its only member, it is deleted.
        </Text>

        <Text style={styles.body}>
          Your phone number is free to sign up again later, but you would start with an empty account.
        </Text>

        <Text style={styles.sectionTitle}>To confirm, type DELETE</Text>
        <TextInput
          style={styles.input}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="DELETE"
          placeholderTextColor={colors.muted}
          editable={!busy}
        />

        <TouchableOpacity
          style={[styles.deleteBtn, (!ready || busy) && styles.btnOff]}
          onPress={handleDelete}
          disabled={!ready || busy}
          accessibilityLabel="Delete my account permanently"
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.deleteText}>Delete my account</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.keepBtn} onPress={() => navigation.goBack()} disabled={busy}>
          <Text style={styles.keepText}>Keep my account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 4 },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
  scroll: { padding: 16, paddingBottom: 48 },
  lead: { fontSize: 20, fontWeight: '600', color: colors.text, lineHeight: 28 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 24, marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 22, color: colors.muted, marginBottom: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.muted, marginTop: 8 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 22, color: colors.muted },
  input: { backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 12, minHeight: 48, fontSize: 16, letterSpacing: 2, color: colors.text },
  deleteBtn: { backgroundColor: colors.danger, borderRadius: 8, minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  btnOff: { opacity: 0.4 },
  deleteText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  keepBtn: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  keepText: { fontSize: 16, fontWeight: '500', color: colors.primary },
});
