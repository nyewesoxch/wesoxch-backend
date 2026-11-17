import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const SITE = 'https://nyewesoxch.github.io';

const TERMS = [
  ['Who can use Wesoxch', 'Wesoxch is for people aged 18 and over.'],
  ['Be kind and honest', 'Do not harass or threaten people, share hate, scam, spam, or post anything illegal. Reported messages are hidden straight away, and we may close accounts that break these rules.'],
  ['Messages disappear', 'Messages in community chats and in Our Therapy are deleted after 24 hours. Other people can still copy or screenshot what you write, so only share what you are comfortable with.'],
  ['What you post', "You are responsible for what you post. Do not share other people's private details without their permission."],
  ['Buying, selling and renting', 'Wesoxch connects people. We do not handle payments, and we cannot guarantee a listing, a seller or a landlord. Check things yourself before you pay, and meet in a safe public place.'],
  ['Our Therapy', 'Our Therapy is peer support, not professional care or an emergency service. If you or someone else is in danger, contact your local emergency services.'],
  ['Ending your account', 'You can delete your account at any time in Settings.'],
  ['Contact', 'wesoxchkenya@gmail.com'],
];

const PRIVACY = [
  ['The short version', 'No adverts. We never sell your data. We do not use tools that follow you across apps. Wesoxch does not record events.'],
  ['What we keep', 'Your phone number (never shown to others), your name and username, and that you confirmed you are 18 or older. Plus what you choose to add: a picture, a bio, listings, rentals, events and messages.'],
  ['Your location', 'Only if you allow it. We save a blurred position, accurate to about 1 km, with what you post.'],
  ['How long we keep it', 'Messages in communities and in Our Therapy are deleted after 24 hours. Your account stays until you delete it.'],
  ['Who helps us', "Africa's Talking sends your sign-in code by SMS. Our hosting provider stores the data. Expo and Google deliver notifications, which never contain the text of your messages."],
  ['Your control', 'You can delete your account and everything you added from Settings.'],
];

const openPage = (path) =>
  Linking.openURL(SITE + path).catch(() =>
    Alert.alert('Could not open the page', `You can find it at ${SITE}${path}`));

export default function LegalScreen({ navigation }) {
  const [tab, setTab] = useState('terms');
  const sections = tab === 'terms' ? TERMS : PRIVACY;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms and Privacy</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.tabs}>
        {[['terms', 'Terms'], ['privacy', 'Privacy']].map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.tab, tab === key && styles.tabActive]} onPress={() => setTab(key)}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: 15 November 2026</Text>
        {sections.map(([title, body]) => (
          <View key={title}>
            <Text style={styles.heading}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
          </View>
        ))}

        {tab === 'privacy' && (
          <View style={styles.links}>
            <TouchableOpacity style={styles.linkBtn} onPress={() => openPage('/privacy.html')}>
              <Text style={styles.linkText}>Read the full Privacy Policy</Text>
              <Ionicons name="open-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={() => openPage('/delete-account.html')}>
              <Text style={styles.linkText}>How to delete your account</Text>
              <Ionicons name="open-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 4 },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  tab: { flex: 1, minHeight: 44, borderRadius: 8, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: colors.text },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  content: { padding: 16, paddingBottom: 48 },
  updated: { fontSize: 12, color: colors.muted, marginBottom: 8 },
  heading: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 24, marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 22, color: colors.muted },
  links: { marginTop: 32, gap: 12 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary },
  linkText: { fontSize: 14, fontWeight: '600', color: colors.primary },
});
