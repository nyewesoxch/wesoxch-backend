import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const COCOA = '#7B4F2E';

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
      {item.cover_url ? <Image source={{ uri: item.cover_url }} style={styles.cardCover} /> : null}
      <View style={styles.cardBody}>
        <View style={[styles.typeBadge, { backgroundColor: '#22C55E' }]}><Text style={styles.typeBadgeText}>📅 EVENT</Text></View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardMeta}>📍 {item.location_name || 'Location TBA'}</Text>
        <Text style={styles.cardMeta}>🗓 {new Date(item.starts_at).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
        <View style={styles.cardRow}>
          <View style={[styles.tag, { backgroundColor: item.is_free ? '#166534' : '#7C2D12' }]}>
            <Text style={styles.tagText}>{item.is_free ? 'FREE' : `KES ${item.price}`}</Text>
          </View>
          <Text style={styles.cardMetaSmall}>👥 {item.attendee_count} going</Text>
        </View>
      </View>
    </View>
  );

  const renderCommunity = (item) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('CommunityChat', { community: item })} activeOpacity={0.8}>
      <View style={styles.cardBody}>
        <View style={[styles.typeBadge, { backgroundColor: COCOA }]}><Text style={styles.typeBadgeText}>👥 COMMUNITY</Text></View>
        <Text style={styles.cardTitle}>{item.name}</Text>
        {item.description ? <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
        <View style={styles.cardRow}>
          <Text style={styles.cardMetaSmall}>👥 {item.member_count} members</Text>
          {item.location_name && <Text style={styles.cardMetaSmall}>📍 {item.location_name}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderListing = (item) => (
    <View style={styles.card}>
      {item.images && item.images.length > 0 && <Image source={{ uri: item.images[0] }} style={styles.cardCover} />}
      <View style={styles.cardBody}>
        <View style={[styles.typeBadge, { backgroundColor: '#7C3AED' }]}><Text style={styles.typeBadgeText}>🛍️ MARKETPLACE</Text></View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.description ? <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
        <View style={styles.cardRow}>
          <Text style={styles.priceText}>{item.price_type === 'free' ? 'FREE' : `KES ${item.price}`}</Text>
          <Text style={styles.cardMetaSmall}>👤 @{item.seller_username}</Text>
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }) => {
    if (item._type === 'event') return renderEvent(item);
    if (item._type === 'community') return renderCommunity(item);
    if (item._type === 'listing') return renderListing(item);
    return null;
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#22C55E" />
      <Text style={styles.loadingText}>Finding your pulse...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🌍 Wesoxch</Text>
          <Text style={styles.headerSub}>Welcome, {user?.full_name?.split(' ')[0] || user?.username} 👋</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notifBtn} onPress={markNotificationsRead}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {unreadCount > 0 && <View style={styles.notifBadge}><Text style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CreateEvent')}>
            <Text style={styles.addBtnText}>+ Event</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={feed}
        keyExtractor={(item) => `${item._type}-${item.id}`}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFeed(); }} tintColor="#22C55E" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Your pulse is quiet 🌍</Text>
            <Text style={styles.emptySubText}>Create events, join communities and post listings to get things going!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#94A3B8', marginTop: 12, fontSize: 14 },
  header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifBtn: { position: 'relative', padding: 4 },
  notifBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2 },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  addBtn: { backgroundColor: '#22C55E', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { backgroundColor: '#1E293B', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' },
  cardCover: { width: '100%', height: 180, resizeMode: 'cover' },
  cardBody: { padding: 14 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8 },
  typeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 6 },
  cardDesc: { fontSize: 13, color: '#94A3B8', marginBottom: 8 },
  cardMeta: { fontSize: 12, color: '#94A3B8', marginBottom: 2 },
  cardMetaSmall: { fontSize: 11, color: '#64748B' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  tag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  priceText: { color: '#22C55E', fontSize: 14, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  emptySubText: { color: '#94A3B8', fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 20 },
});
