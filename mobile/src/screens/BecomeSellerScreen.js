import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import api from '../api/client';

export default function BecomeSellerScreen({ navigation }) {
  const { setUser } = useAuth();
  const [sellerBio, setSellerBio] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!whatsapp) { Alert.alert('Required', 'WhatsApp number is required'); return; }
    setLoading(true);
    try {
      const res = await api.post('/users/become-seller', { seller_bio: sellerBio, seller_whatsapp: whatsapp });
      setUser(res.data.user);
      Alert.alert('Welcome, Seller!', 'You can now post listings on Wesoxch.', [{ text: 'Start Selling', onPress: () => navigation.navigate('MyListings') }]);
    } catch { Alert.alert('Error', 'Could not register as seller.'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Become a Seller</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🛍️</Text>
          <Text style={styles.heroTitle}>Start Selling on Wesoxch</Text>
          <Text style={styles.heroDesc}>Connect directly with buyers. No commission. No middlemen.</Text>
        </View>
        <View style={styles.perks}>
          {['📍 Reach buyers near you', '💬 Direct WhatsApp contact', '🆓 Free to list, always', '🌍 Grow your local business'].map((perk, i) => (
            <View key={i} style={styles.perk}>
              <Text style={styles.perkText}>{perk}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.label}>WhatsApp Number * (buyers contact you here)</Text>
        <TextInput style={styles.input} value={whatsapp} onChangeText={setWhatsapp} placeholder="+254712345678" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
        <Text style={styles.label}>Seller Bio (optional)</Text>
        <TextInput style={[styles.input, styles.inputMulti]} value={sellerBio} onChangeText={setSellerBio} placeholder="Tell buyers what you sell..." placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />
        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Register as Seller</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  scroll: { padding: 16, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 24 },
  heroEmoji: { fontSize: 52, marginBottom: 12 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  heroDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  perks: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 24, gap: 12, borderWidth: 1, borderColor: colors.border },
  perk: { flexDirection: 'row', alignItems: 'center' },
  perkText: { color: colors.textPrimary, fontSize: 14 },
  label: { color: colors.textMuted, fontSize: 12, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: colors.bgElevated, color: colors.textPrimary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: colors.market, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
