import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const COCOA = '#7B4F2E';

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/users/${userId}`)
      .then(res => setProfile(res.data))
      .catch(() => { Alert.alert('Error', 'Could not load profile'); navigation.goBack(); })
      .finally(() => setLoading(false));
  }, [userId]);

  const handleWhatsApp = (number) => {
    const clean = number.replace(/[^0-9]/g, '');
    Linking.openURL(`whatsapp://send?phone=${clean}`).catch(() => Alert.alert('WhatsApp not found', `Contact: ${number}`));
  };

  const parseImages = (images) => {
    if (!images) return [];
    if (Array.isArray(images)) return images.filter(Boolean);
    return images.replace(/[{}"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COCOA} /></View>;

  const { user, listings, events } = profile;
  const isOwn = currentUser?.id === userId;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>@{user.username}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.profileTop}>
          {user.avatar_url
            ? <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            : <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{(user.full_name || user.username).charAt(0).toUpperCase()}</Text></View>}
          <Text style={styles.fullName}>{user.full_name || user.username}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          <View style={styles.badges}>
            {user.is_verified && <Text style={styles.badge}>✅ Verified</Text>}
            {user.is_seller && <Text style={[styles.badge, { color: COCOA }]}>🛍️ Seller</Text>}
          </View>
          {user.location_name && <Text style={styles.location}>📍 {user.location_name}</Text>}
          {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
        </View>

        {user.is_seller && user.seller_whatsapp && !isOwn && (
          <TouchableOpacity style={styles.contactBtn} onPress={() => handleWhatsApp(user.seller_whatsapp)}>
            <Ionicons name="logo-whatsapp" size={18} color="#fff" />
            <Text style={styles.contactBtnText}>Contact via WhatsApp</Text>
          </TouchableOpacity>
        )}

        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statNum}>{listings?.length || 0}</Text><Text style={styles.statLabel}>Listings</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><Text style={styles.statNum}>{events?.length || 0}</Text><Text style={styles.statLabel}>Events</Text></View>
        </View>

        {listings && listings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛍️ Listings</Text>
            {listings.map(item => {
              const imgs = parseImages(item.images);
              return (
                <View key={item.id} style={styles.listingCard}>
                  {imgs.length > 0 && <Image source={{ uri: imgs[0] }} style={styles.listingImg} />}
                  <View style={styles.listingInfo}>
                    <Text style={styles.listingTitle}>{item.title}</Text>
                    <Text style={styles.listingPrice}>{item.price_type === 'free' ? 'FREE' : `KES ${item.price}`}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {events && events.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Events</Text>
            {events.map(item => (
              <View key={item.id} style={styles.eventCard}>
                {item.cover_url && <Image source={{ uri: item.cover_url }} style={styles.eventCover} />}
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  <Text style={styles.eventMeta}>🗓 {new Date(item.starts_at).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
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
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  scroll: { padding: 16, paddingBottom: 40 },
  profileTop: { alignItems: 'center', marginBottom: 16 },
  avatar: { width: 90, height: 90, borderRadius: 45, marginBottom: 12, borderWidth: 3, borderColor: COCOA },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: COCOA, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  fullName: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  username: { fontSize: 14, color: '#94A3B8', marginBottom: 8 },
  badges: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  badge: { color: '#22C55E', fontSize: 12 },
  location: { color: '#64748B', fontSize: 13, marginBottom: 8 },
  bio: { color: '#94A3B8', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  contactBtn: { flexDirection: 'row', gap: 8, backgroundColor: '#166534', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  contactBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statsRow: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#64748B', fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#334155' },
  section: { marginBottom: 20 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  listingCard: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 12, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  listingImg: { width: 80, height: 80 },
  listingInfo: { flex: 1, padding: 10 },
  listingTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  listingPrice: { color: '#22C55E', fontSize: 13, fontWeight: '700' },
  eventCard: { backgroundColor: '#1E293B', borderRadius: 12, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  eventCover: { width: '100%', height: 120 },
  eventInfo: { padding: 12 },
  eventTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 6 },
  eventMeta: { color: '#94A3B8', fontSize: 12 },
});
