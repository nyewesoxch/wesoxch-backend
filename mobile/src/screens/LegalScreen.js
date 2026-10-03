import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const COCOA = '#7B4F2E';

export default function LegalScreen({ navigation }) {
  const [tab, setTab] = useState('terms');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Legal</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.tabs}>
        {['terms','privacy'].map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'terms' ? 'Terms of Service' : 'Privacy Policy'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: October 2026</Text>
        {tab === 'terms' ? (
          <>
            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.body}>By using Wesoxch, you agree to these Terms of Service.</Text>
            <Text style={styles.sectionTitle}>2. Eligibility</Text>
            <Text style={styles.body}>You must be at least 13 years old to use Wesoxch.</Text>
            <Text style={styles.sectionTitle}>3. User Conduct</Text>
            <Text style={styles.body}>You agree not to:{'\n'}• Post false or harmful content{'\n'}• Harass or abuse other users{'\n'}• Use the platform for illegal activities{'\n'}• Spam communities or listings</Text>
            <Text style={styles.sectionTitle}>4. Marketplace & Rentals</Text>
            <Text style={styles.body}>Wesoxch connects buyers, sellers, landlords and tenants. We do not handle payments or guarantees any transactions.</Text>
            <Text style={styles.sectionTitle}>5. Our Therapy</Text>
            <Text style={styles.body}>Our Therapy is peer support, not professional therapy. If you are in crisis, please contact a professional.</Text>
            <Text style={styles.sectionTitle}>6. Contact</Text>
            <Text style={styles.body}>wesoxchkenya@gmail.com</Text>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>1. Information We Collect</Text>
            <Text style={styles.body}>We collect account info, profile info you provide, content you post, and approximate location (with permission).</Text>
            <Text style={styles.sectionTitle}>2. How We Use It</Text>
            <Text style={styles.body}>We use your information to provide and improve Wesoxch. We do NOT sell your data or show ads.</Text>
            <Text style={styles.sectionTitle}>3. Email Privacy</Text>
            <Text style={styles.body}>Your full email is never shown to other users.</Text>
            <Text style={styles.sectionTitle}>4. Your Rights</Text>
            <Text style={styles.body}>You can edit or delete your profile at any time. Contact us to delete your account.</Text>
            <Text style={styles.sectionTitle}>5. Contact</Text>
            <Text style={styles.body}>wesoxchkenya@gmail.com</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1E293B', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  tabActive: { backgroundColor: COCOA, borderColor: COCOA },
  tabText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  updated: { color: '#64748B', fontSize: 12, marginBottom: 16 },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  body: { color: '#94A3B8', fontSize: 14, lineHeight: 22 },
});
