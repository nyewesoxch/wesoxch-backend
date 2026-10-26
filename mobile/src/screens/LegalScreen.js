import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function LegalScreen({ navigation }) {
  const [tab, setTab] = useState('terms');
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Legal</Text>
        <View style={{ width: 22 }} />
      </View>
      <View style={styles.tabs}>
        {['terms','privacy'].map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab===t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab===t && styles.tabTextActive]}>{t==='terms' ? 'Terms' : 'Privacy'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: October 2026</Text>
        {tab === 'terms' ? (
          <>
            <Text style={styles.heading}>1. Acceptance</Text>
            <Text style={styles.body}>By using Wesoxch, you agree to these Terms of Service.</Text>
            <Text style={styles.heading}>2. Eligibility</Text>
            <Text style={styles.body}>You must be at least 13 years old to use Wesoxch.</Text>
            <Text style={styles.heading}>3. Conduct</Text>
            <Text style={styles.body}>No harmful content, harassment, spam or illegal activities.</Text>
            <Text style={styles.heading}>4. Marketplace & Rentals</Text>
            <Text style={styles.body}>We connect buyers, sellers and landlords but don't handle payments or guarantee transactions.</Text>
            <Text style={styles.heading}>5. Our Therapy</Text>
            <Text style={styles.body}>This is peer support, not professional therapy. In crisis, please seek professional help.</Text>
            <Text style={styles.heading}>6. Contact</Text>
            <Text style={styles.body}>wesoxchkenya@gmail.com</Text>
          </>
        ) : (
          <>
            <Text style={styles.heading}>1. What We Collect</Text>
            <Text style={styles.body}>Account info, profile info you provide, content you post, and approximate location (with permission).</Text>
            <Text style={styles.heading}>2. How We Use It</Text>
            <Text style={styles.body}>To provide and improve Wesoxch. We do NOT sell your data or show ads.</Text>
            <Text style={styles.heading}>3. Email Privacy</Text>
            <Text style={styles.body}>Your full email is never shown to other users.</Text>
            <Text style={styles.heading}>4. Your Rights</Text>
            <Text style={styles.body}>You can edit or delete your profile anytime. Contact us to delete your account.</Text>
            <Text style={styles.heading}>5. Contact</Text>
            <Text style={styles.body}>wesoxchkenya@gmail.com</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.bgElevated, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: colors.primary },
  content: { padding: 16, paddingBottom: 40 },
  updated: { color: colors.textMuted, fontSize: 12, marginBottom: 16 },
  heading: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 20, marginBottom: 6 },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
});
