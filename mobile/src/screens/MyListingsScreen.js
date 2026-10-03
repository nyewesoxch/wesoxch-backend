import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';

const COCOA = '#7B4F2E';

export default function MyListingsScreen({ navigation }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMyListings();
    const unsubscribe = navigation.addListener('focus', fetchMyListings);
    return unsubscribe;
  }, [navigation]);

  const fetchMyListings = async () => {
    try { const res = await api.get('/listings/user/me'); setListings(res.data.listings || []); }
    catch (err) { console.error('My listings error:', err.message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const parseImages = (images) => { if (!images) return []; if (Array.isArray(images)) return images.filter(Boolean); return images.replace(/[{}"]/g, '').split(',').map(s => s.trim()).filter(Boolean); };

  const handleDelete = (item) => {
    Alert.alert('Delete', `Delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/listings/${item.id}`); setListings(prev => prev.filter(l => l.id !== item.id)); }
        catch (err) { Alert.alert('Error', 'Could not delete.'); }
      }}
    ]);
  };

  const handleToggle = async (item) => {
    try {
      const res = await api.patch(`/listings/${item.id}`, { is_available: !item.is_available });
      setListings(prev => prev.map(l => l.id === item.id ? { ...res.data.listing, images: parseImages(res.data.listing.images) } : l));
    } catch (err) { Alert.alert('Error', 'Could not update.'); }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COCOA} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>My Listings</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateListing')}><Ionicons name="add-circle" size={28} color={COCOA} /></TouchableOpacity>
      </View>
      <FlatList data={listings} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMyListings(); }} tintColor={COCOA} />}
        renderItem={({ item }) => {
          const imgs = parseImages(item.images);
          return (
            <View style={[styles.card, !item.is_available && styles.cardInactive]}>
              <View style={styles.cardTop}>
                {imgs.length > 0 && <Image source={{ uri: imgs[0] }} style={styles.listingImg} />}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardPrice}>{item.price_type === 'free' ? 'FREE' : `KES ${item.price}`} · {item.price_type}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.is_available ? '#166534' : '#334155' }]}>
                  <Text style={styles.statusText}>{item.is_available ? 'Live' : 'Hidden'}</Text>
                </View>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.metaText}>👁️ {item.view_count} views</Text>
                {item.category && <Text style={styles.metaText}>🏷️ {item.category}</Text>}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: item.is_available ? '#334155' : '#22C55E' }]} onPress={() => handleToggle(item)}>
                  <Text style={styles.actionBtnText}>{item.is_available ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#7F1D1D' }]} onPress={() => handleDelete(item)}>
                  <Text style={styles.actionBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="storefront-outline" size={48} color="#334155" />
            <Text style={styles.emptyText}>No listings yet</Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateListing')}>
              <Text style={styles.createBtnText}>Post Your First Listing</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  cardInactive: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  listingImg: { width: 56, height: 56, borderRadius: 10, marginRight: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardPrice: { color: '#22C55E', fontSize: 13, fontWeight: '600' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  metaText: { color: '#64748B', fontSize: 11 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: '#94A3B8', fontSize: 16 },
  createBtn: { backgroundColor: COCOA, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  createBtnText: { color: '#fff', fontWeight: '700' },
});
