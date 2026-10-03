import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const COCOA = '#7B4F2E';

export default function BecomeSellerScreen({ navigation }) {
  const { setUser } = useAuth();
  const [sellerBio, setSellerBio] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!whatsapp) { Alert.alert('Required', 'WhatsApp number is required so buyers can reach you.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/users/become-seller', { seller_bio: sellerBio, seller_whatsapp: whatsapp });
      setUser(res.data.user);
      Alert.alert('Welcome, Seller! 🛍️', 'You can now post listings on Wesoxch.', [{ text: 'Start Selling', onPress: () => navigation.navigate('MyListings') }]);
    } catch (err) { Alert.alert('Error', 'Could not register as seller.'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Become a Seller</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🛍️</Text>
          <Text style={styles.heroTitle}>Start Selling on Wesoxch</Text>
          <Text style={styles.heroDesc}>Connect directly with buyers in your community. No commissions, no middlemen.</Text>
        </View>
        <View style={styles.perks}>
          {[['📍','Reach buyers near you'],['💬','Connect via WhatsApp directly'],['🆓','Free to list, always'],['🌍','Be part of the local economy']].map(([icon, text], i) => (
            <View key={i} style={styles.perk}><Text style={styles.perkIcon}>{icon}</Text><Text style={styles.perkText}>{text}</Text></View>
          ))}
        </View>
        <Text style={styles.label}>WhatsApp Number * (buyers will use this)</Text>
        <TextInput style={styles.input} value={whatsapp} onChangeText={setWhatsapp} placeholder="+254712345678" placeholderTextColor="#64748B" keyboardType="phone-pad" />
        <Text style={styles.label}>Seller Bio (optional)</Text>
        <TextInput style={[styles.input, styles.inputMulti]} value={sellerBio} onChangeText={setSellerBio} placeholder="Tell buyers what you sell..." placeholderTextColor="#64748B" multiline numberOfLines={3} />
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Register as Seller</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  scroll: { padding: 16, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 24 },
  heroIcon: { fontSize: 48, marginBottom: 12 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' },
  heroDesc: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 22 },
  perks: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 24, gap: 12 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  perkIcon: { fontSize: 20 },
  perkText: { color: '#fff', fontSize: 14 },
  label: { color: '#94A3B8', fontSize: 12, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#1E293B', color: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, borderWidth: 1, borderColor: '#334155' },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: COCOA, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
