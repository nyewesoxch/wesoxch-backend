import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import api from '../api/client';

const POINTS = [
  ['heart-outline', 'What you write here may be about your health or your feelings. That is sensitive, so we ask for your clear agreement before you join.'],
  ['people-outline', 'People in a room can read what is written. If you write anonymously, they see a made-up name. We still record which account wrote each message, only so we can act on abuse. We never show it to other people.'],
  ['time-outline', 'Messages are deleted after 24 hours. Someone could still copy or screenshot what you write, so share only what you are comfortable with.'],
  ['medkit-outline', 'Our Therapy is peer support. It is not professional care and not an emergency service. If you or someone else is in danger, contact your local emergency services.'],
  ['exit-outline', 'You can stop at any time. Deleting your account in Settings removes your agreement and everything you wrote.'],
];

export default function TherapyConsentScreen({ navigation }) {
  const [busy, setBusy] = useState(false);

  const agree = async () => {
    setBusy(true);
    try {
      await api.post('/therapy/consent');
      navigation.replace('Therapy');
    } catch (e) {
      Alert.alert('Sorry, we could not save that', e.response?.data?.message || 'Check your connection and try again.');
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Before you join</Text>
        <Text style={styles.lead}>Our Therapy is a place to talk and to listen. Please read how it works.</Text>

        {POINTS.map(([icon, text]) => (
          <View key={icon} style={styles.point}>
            <Ionicons name={icon} size={24} color={colors.primary} />
            <Text style={styles.pointText}>{text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.agreeBtn, busy && styles.off]} onPress={agree} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.agreeText}>I understand and agree</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.laterBtn} onPress={() => navigation.goBack()} disabled={busy}>
          <Text style={styles.laterText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 24, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '600', color: colors.text, marginTop: 16 },
  lead: { fontSize: 16, lineHeight: 24, color: colors.muted, marginTop: 8, marginBottom: 24 },
  point: { flexDirection: 'row', gap: 16, backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  pointText: { flex: 1, fontSize: 14, lineHeight: 22, color: colors.text },
  actions: { padding: 16, gap: 8, borderTopWidth: 1, borderTopColor: colors.border },
  agreeBtn: { backgroundColor: colors.primary, borderRadius: 8, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  off: { opacity: 0.6 },
  agreeText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  laterBtn: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  laterText: { fontSize: 16, fontWeight: '500', color: colors.primary },
});
