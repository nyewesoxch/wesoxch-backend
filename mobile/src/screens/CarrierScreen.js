import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function CarrierScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🚚 Carrier</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🚚</Text>
          <Text style={styles.heroTitle}>Carrier Deliveries</Text>
          <Text style={styles.heroDesc}>Book local drivers to deliver your marketplace purchases anywhere in the city.</Text>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming in v2.1</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>What's Coming</Text>
        <View style={styles.featureList}>
          {[
            { icon: 'car-outline', color: colors.blue, title: 'Book a Driver', desc: 'Find available drivers near you in real time.' },
            { icon: 'location-outline', color: colors.green, title: 'Live Tracking', desc: 'Track your package from pickup to delivery.' },
            { icon: 'cube-outline', color: colors.amber, title: 'Package Management', desc: 'Scan, confirm and manage deliveries easily.' },
            { icon: 'people-outline', color: colors.purple, title: 'Three Roles', desc: 'Customer, Driver or Station Admin — all supported.' },
          ].map((f, i) => (
            <View key={i} style={styles.feature}>
              <View style={[styles.featureIcon, { backgroundColor: f.color + '20' }]}>
                <Ionicons name={f.icon} size={22} color={f.color} />
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.creditBox}>
          <Text style={styles.creditTitle}>Built in collaboration with</Text>
          <Text style={styles.creditName}>munyokii — github.com/munyokii/carrier</Text>
          <Text style={styles.creditDesc}>Original Carrier app built with Flutter + Firebase. Integrated into Wesoxch as a super app feature.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  scroll: { padding: 16, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 32, paddingVertical: 24, backgroundColor: colors.bgCard, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  heroEmoji: { fontSize: 56, marginBottom: 12 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  heroDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 24, marginBottom: 16 },
  comingSoonBadge: { backgroundColor: colors.blue + '20', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1, borderColor: colors.blue + '40' },
  comingSoonText: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  sectionTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 },
  featureList: { gap: 10, marginBottom: 24 },
  feature: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 14 },
  featureIcon: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  featureInfo: { flex: 1 },
  featureTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  featureDesc: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  creditBox: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.blue + '30', gap: 6 },
  creditTitle: { color: colors.textMuted, fontSize: 11, letterSpacing: 1 },
  creditName: { color: colors.blue, fontSize: 14, fontWeight: '700' },
  creditDesc: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
});
