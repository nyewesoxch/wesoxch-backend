import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import api from '../api/client';

const parseImgs = (imgs) => {
  if (!imgs) return [];
  if (Array.isArray(imgs)) return imgs.filter(Boolean);
  return imgs.replace(/[{}"]/g,'').split(',').map(s=>s.trim()).filter(Boolean);
};

export default function MyListingsScreen({ navigation }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchMyListings(); const u = navigation.addListener('focus', fetchMyListings); return u; }, [navigation]);

  const fetchMyListings = async () => {
    try { const res = await api.get('/listings/user/me'); setListings(res.data.listings || []); }
    catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleDelete = (item) => {
    Alert.alert('Delete', `Delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/listings/${item.id}`); setListings(p => p.filter(l => l.id !== item.id)); }
        catch { Alert.alert('Error', 'Could not delete.'); }
      }}
    ]);
  };

  const handleToggle = async (item) => {
    try {
      const res = await api.patch(`/listings/${item.id}`, { is_available: !item.is_available });
      setListings(p => p.map(l => l.id === item.id ? { ...res.data.listing, images: parseImgs(res.data.listing.images) } : l));
    } catch { Alert.alert('Error', 'Could not update.'); }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Listings</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateListing')}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={listings}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMyListings(); }} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const imgs = parseImgs(item.images);
          return (
            <View style={[styles.card, !item.is_available && styles.cardInactive]}>
              <View style={styles.cardTop}>
                {imgs[0] && <Image source={{ uri: imgs[0] }} style={styles.listingImg} />}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.cardPrice}>{item.price_type==='free' ? 'FREE' : `KES ${item.price}`}</Text>
                  <Text style={styles.cardMeta}>👁 {item.view_count} views</Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: item.is_available ? colors.green : colors.textMuted }]} />
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: item.is_available ? colors.bgElevated : colors.green + '20', borderColor: item.is_available ? colors.border : colors.green }]} onPress={() => handleToggle(item)}>
                  <Text style={[styles.actionText, { color: item.is_available ? colors.textMuted : colors.green }]}>{item.is_available ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.rose + '15', borderColor: colors.rose + '40' }]} onPress={() => handleDelete(item)}>
                  <Text style={[styles.actionText, { color: colors.rose }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="storefront-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No listings yet</Text>
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
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  card: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 12 },
  cardInactive: { opacity: 0.55 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listingImg: { width: 56, height: 56, borderRadius: 10 },
  cardInfo: { flex: 1, gap: 3 },
  cardTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  cardPrice: { color: colors.green, fontSize: 13, fontWeight: '700' },
  cardMeta: { color: colors.textMuted, fontSize: 11 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
  actionText: { fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { color: colors.textSecondary, fontSize: 16 },
  createBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  createBtnText: { color: '#fff', fontWeight: '700' },
});
