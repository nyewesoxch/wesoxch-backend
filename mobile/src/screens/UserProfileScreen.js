import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import api from '../api/client';

const parseImgs = (imgs) => {
  if (!imgs) return [];
  if (Array.isArray(imgs)) return imgs.filter(Boolean);
  return imgs.replace(/[{}"]/g,'').split(',').map(s=>s.trim()).filter(Boolean);
};

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const { user: me } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/users/${userId}`)
      .then(res => setProfile(res.data))
      .catch(() => { Alert.alert('Error', 'Could not load profile'); navigation.goBack(); })
      .finally(() => setLoading(false));
  }, [userId]);

  const handleWhatsApp = (number) => {
    const clean = number.replace(/[^0-9]/g,'');
    Linking.openURL(`whatsapp://send?phone=${clean}`).catch(() => Alert.alert('WhatsApp', `Contact: ${number}`));
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>;

  const { user, listings, events } = profile;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{user.username}</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.profileTop}>
          {user.avatar_url
            ? <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            : <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{(user.full_name||user.username).charAt(0).toUpperCase()}</Text></View>
          }
          <Text style={styles.fullName}>{user.full_name || user.username}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          <View style={styles.badges}>
            {user.is_verified && <Text style={styles.badge}>✅ Verified</Text>}
            {user.is_seller && <Text style={[styles.badge, { color: colors.market }]}>🛍️ Seller</Text>}
          </View>
          {user.location_name && <Text style={styles.location}>📍 {user.location_name}</Text>}
          {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
        </View>

        {user.is_seller && user.seller_whatsapp && me?.id !== userId && (
          <TouchableOpacity style={styles.waBtn} onPress={() => handleWhatsApp(user.seller_whatsapp)}>
            <Ionicons name="logo-whatsapp" size={18} color="#fff" />
            <Text style={styles.waBtnText}>Contact on WhatsApp</Text>
          </TouchableOpacity>
        )}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{listings?.length || 0}</Text>
            <Text style={styles.statLabel}>Listings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{events?.length || 0}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
        </View>

        {listings?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛍️ Listings</Text>
            {listings.map(item => {
              const imgs = parseImgs(item.images);
              return (
                <View key={item.id} style={styles.listingCard}>
                  {imgs[0] && <Image source={{ uri: imgs[0] }} style={styles.listingImg} />}
                  <View style={styles.listingInfo}>
                    <Text style={styles.listingTitle}>{item.title}</Text>
                    <Text style={styles.listingPrice}>{item.price_type==='free' ? 'FREE' : `KES ${item.price}`}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {events?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Events</Text>
            {events.map(item => (
              <View key={item.id} style={styles.eventCard}>
                {item.cover_url && <Image source={{ uri: item.cover_url }} style={styles.eventCover} />}
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  <Text style={styles.eventMeta}>{new Date(item.starts_at).toLocaleDateString('en-KE', { weekday:'short', month:'short', day:'numeric' })}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  scroll: { padding: 16, paddingBottom: 40 },
  profileTop: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 84, height: 84, borderRadius: 42, marginBottom: 12 },
  avatarPlaceholder: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  fullName: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  username: { fontSize: 14, color: colors.textMuted, marginBottom: 8 },
  badges: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  badge: { color: colors.green, fontSize: 12, fontWeight: '600' },
  location: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  bio: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  waBtn: { flexDirection: 'row', gap: 8, backgroundColor: '#166534', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  waBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statsRow: { flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },
  section: { marginBottom: 20 },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  listingCard: { flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: 12, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  listingImg: { width: 76, height: 76 },
  listingInfo: { flex: 1, padding: 10 },
  listingTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  listingPrice: { color: colors.green, fontSize: 13, fontWeight: '700' },
  eventCard: { backgroundColor: colors.bgCard, borderRadius: 12, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  eventCover: { width: '100%', height: 110 },
  eventInfo: { padding: 10 },
  eventTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  eventMeta: { color: colors.textMuted, fontSize: 12 },
});
