import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import api from '../api/client';

const parseImages = (images) => {
  if (!images) return [];
  if (Array.isArray(images)) return images.filter(Boolean);
  return images.replace(/[{}"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
};

export default function PulseScreen({ navigation }) {
  const { user, unreadCount, markNotificationsRead } = useAuth();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchFeed(); }, []);

  const fetchFeed = async () => {
    try {
      const [evRes, comRes, listRes] = await Promise.all([
        api.get('/events?limit=10'),
        api.get('/communities?limit=10'),
        api.get('/listings?limit=10'),
      ]);
      const events = (evRes.data.events || []).map(e => ({ ...e, _type: 'event' }));
      const communities = (comRes.data.communities || []).map(c => ({ ...c, _type: 'community' }));
      const listings = (listRes.data.listings || []).map(l => ({ ...l, _type: 'listing', images: parseImages(l.images) }));
      const combined = [];
      const maxLen = Math.max(events.length, communities.length, listings.length);
      for (let i = 0; i < maxLen; i++) {
        if (events[i]) combined.push(events[i]);
        if (listings[i]) combined.push(listings[i]);
        if (communities[i]) combined.push(communities[i]);
      }
      setFeed(combined);
    } catch (err) { console.error('Feed error:', err.message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const renderEvent = (item) => (
    <View style={styles.card}>
      {item.cover_url && <Image source={{ uri: item.cover_url }} style={styles.cardCover} />}
      {!item.cover_url && (
        <LinearGradient colors={['#7C3AED', '#4C1D95']} style={styles.cardCoverGradient}>
          <Text style={styles.cardCoverEmoji}>📅</Text>
        </LinearGradient>
      )}
      <View style={styles.cardBody}>
        <View style={[styles.badge, { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)' }]}>
          <Text style={[styles.badgeText, { color: colors.green }]}>EVENT</Text>
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardMeta}>📍 {item.location_name || 'Location TBA'}</Text>
        <Text style={styles.cardMeta}>🗓 {new Date(item.starts_at).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
        <View style={styles.cardFooterRow}>
          <View style={[styles.pill, { backgroundColor: item.is_free ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }]}>
            <Text style={[styles.pillText, { color: item.is_free ? colors.green : colors.amber }]}>{item.is_free ? 'FREE' : `KES ${item.price}`}</Text>
          </View>
          <Text style={styles.metaSmall}>👥 {item.attendee_count} going</Text>
        </View>
      </View>
    </View>
  );

  const renderCommunity = (item) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('CommunityChat', { community: item })} activeOpacity={0.8}>
      <LinearGradient colors={['#7C3AED22', '#0A0A0F']} style={styles.cardCoverGradient}>
        <Text style={styles.cardCoverEmoji}>👥</Text>
      </LinearGradient>
      <View style={styles.cardBody}>
        <View style={[styles.badge, { backgroundColor: 'rgba(124,58,237,0.15)', borderColor: 'rgba(124,58,237,0.3)' }]}>
          <Text style={[styles.badgeText, { color: colors.purple }]}>COMMUNITY</Text>
        </View>
        <Text style={styles.cardTitle}>{item.name}</Text>
        {item.description && <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>}
        <View style={styles.cardFooterRow}>
          <Text style={styles.metaSmall}>👥 {item.member_count} members</Text>
          {item.location_name && <Text style={styles.metaSmall}>📍 {item.location_name}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderListing = (item) => (
    <View style={styles.card}>
      {item.images?.length > 0
        ? <Image source={{ uri: item.images[0] }} style={styles.cardCover} />
        : <LinearGradient colors={['#10B98122', '#0A0A0F']} style={styles.cardCoverGradient}><Text style={styles.cardCoverEmoji}>🛍️</Text></LinearGradient>
      }
      <View style={styles.cardBody}>
        <View style={[styles.badge, { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)' }]}>
          <Text style={[styles.badgeText, { color: colors.market }]}>MARKETPLACE</Text>
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.description && <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>}
        <View style={styles.cardFooterRow}>
          <Text style={styles.priceText}>{item.price_type === 'free' ? 'FREE' : `KES ${item.price}`}</Text>
          <Text style={styles.metaSmall}>@{item.seller_username}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Finding your pulse...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🌍 Wesoxch</Text>
          <Text style={styles.headerSub}>Hey {user?.full_name?.split(' ')[0] || user?.username} 👋</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notifBtn} onPress={markNotificationsRead}>
            <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.notifDot}>
                <Text style={styles.notifDotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateEvent')}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.createBtnText}>Event</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={feed}
        keyExtractor={item => `${item._type}-${item.id}`}
        renderItem={({ item }) => {
          if (item._type === 'event') return renderEvent(item);
          if (item._type === 'community') return renderCommunity(item);
          if (item._type === 'listing') return renderListing(item);
          return null;
        }}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFeed(); }} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌍</Text>
            <Text style={styles.emptyTitle}>Your pulse is quiet</Text>
            <Text style={styles.emptyDesc}>Create events, join communities and post listings to get things going!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary, marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifBtn: { position: 'relative', width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgElevated, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  notifDot: { position: 'absolute', top: -2, right: -2, backgroundColor: colors.rose, borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  notifDotText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  card: { backgroundColor: colors.bgCard, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  cardCover: { width: '100%', height: 180 },
  cardCoverGradient: { width: '100%', height: 100, justifyContent: 'center', alignItems: 'center' },
  cardCoverEmoji: { fontSize: 40 },
  cardBody: { padding: 14, gap: 6 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  cardDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  cardMeta: { fontSize: 12, color: colors.textSecondary },
  cardFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  pill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: '700' },
  priceText: { color: colors.green, fontSize: 15, fontWeight: '800' },
  metaSmall: { fontSize: 11, color: colors.textMuted },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyDesc: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
