import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Linking, Alert, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import api from '../api/client';

const toList = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return String(v).replace(/[{}"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
};

const priceText = (item) =>
  item.price_type === 'free' ? 'Free' : `KES ${Number(item.price).toLocaleString()}`;

export default function StoreScreen({ route, navigation }) {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  // With no username given (the "My store" button), this opens your own store
  const username = String(route.params?.username || user?.username || '').toLowerCase();
  const isOwner = username === String(user?.username || '').toLowerCase();
  const tileW = (width - 16 * 2 - 12) / 2;

  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [problem, setProblem] = useState(null); // 'none' = no store, 'network' = could not reach the server

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/premium/store/${encodeURIComponent(username)}`);
      setStore({ ...res.data, listings: res.data.listings.map(l => ({ ...l, images: toList(l.images) })) });
      setProblem(null);
    } catch (e) {
      setStore(null);
      setProblem(e.response?.status === 404 ? 'none' : 'network');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [username]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const seller = store?.seller;

  const openListing = (item) =>
    navigation.navigate('ListingDetail', {
      listing: {
        ...item,
        created_by: seller.id,
        seller_username: seller.username,
        seller_name: seller.full_name || seller.username,
        seller_whatsapp: seller.seller_whatsapp,
        seller_premium: true,
        seller_avatar: seller.avatar_url,
      },
    });

  const contact = () => {
    let n = String(seller.seller_whatsapp || '').replace(/[^0-9]/g, '');
    if (!n) return;
    if (n.startsWith('0')) n = '254' + n.slice(1);
    Linking.openURL(`https://wa.me/${n}`).catch(() =>
      Alert.alert('Could not open WhatsApp', 'Please try again, or use the number in their profile.'));
  };

  const Header = (
    <View style={styles.profile}>
      {seller?.avatar_url ? (
        <Image source={{ uri: seller.avatar_url }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.avatarLetter]}>
          <Text style={styles.avatarText}>{(seller?.full_name || seller?.username || '?').charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.name} numberOfLines={1}>{seller?.full_name || seller?.username}</Text>
      <Text style={styles.handle}>@{seller?.username}</Text>
      {!!seller?.location_name && (
        <View style={styles.locRow}>
          <Ionicons name="location-outline" size={16} color={colors.muted} />
          <Text style={styles.locText} numberOfLines={1}>{seller.location_name}</Text>
        </View>
      )}
      {!!(seller?.seller_bio || seller?.bio) && (
        <Text style={styles.about} numberOfLines={3}>{seller.seller_bio || seller.bio}</Text>
      )}

      {!isOwner && !!seller?.seller_whatsapp && (
        <TouchableOpacity style={styles.primaryBtn} onPress={contact} accessibilityLabel="Message the seller on WhatsApp">
          <Ionicons name="logo-whatsapp" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Message the seller</Text>
        </TouchableOpacity>
      )}
      {isOwner && !seller?.seller_whatsapp && (
        <Text style={styles.hint}>Buyers cannot message you yet. Open Profile, then Sell, to add your WhatsApp number.</Text>
      )}
      {isOwner && (
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('CreateListing')}>
          <Ionicons name="add" size={20} color={colors.primary} />
          <Text style={styles.secondaryBtnText}>Add a listing</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.count}>
        {store?.total || 0} {store?.total === 1 ? 'item' : 'items'} for sale
      </Text>
    </View>
  );

  const renderTile = ({ item }) => (
    <TouchableOpacity
      style={{ width: tileW }}
      onPress={() => openListing(item)}
      activeOpacity={0.85}
      accessibilityLabel={`${item.title}, ${priceText(item)}`}
    >
      {item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={styles.tilePhoto} contentFit="cover" transition={150} cachePolicy="memory-disk" recyclingKey={item.id} />
      ) : (
        <View style={[styles.tilePhoto, styles.tileNoPhoto]}>
          <Ionicons name="image-outline" size={28} color={colors.muted} />
        </View>
      )}
      <Text style={styles.tileTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.tilePrice}>{priceText(item)}</Text>
    </TouchableOpacity>
  );

  let body;
  if (loading) {
    body = (
      <View style={styles.skelWrap}>
        <View style={styles.skelAvatar} />
        <View style={[styles.skelLine, { width: '45%' }]} />
        <View style={[styles.skelLine, { width: '30%' }]} />
        <View style={styles.skelRow}>
          <View style={[styles.skelTile, { width: tileW }]} />
          <View style={[styles.skelTile, { width: tileW }]} />
        </View>
      </View>
    );
  } else if (problem === 'none') {
    body = isOwner ? (
      <View style={styles.centerBox}>
        <Ionicons name="storefront-outline" size={40} color={colors.muted} />
        <Text style={styles.centerTitle}>Your store is not open yet</Text>
        <Text style={styles.centerText}>
          A store puts everything you sell on one page, so buyers can see more from you. Premium memberships are coming
          soon. Until then, your listings still show up for everyone in the marketplace.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate(user?.is_seller ? 'MyListings' : 'BecomeSeller')}
        >
          <Text style={styles.primaryBtnText}>{user?.is_seller ? 'See my listings' : 'Become a seller'}</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <View style={styles.centerBox}>
        <Ionicons name="storefront-outline" size={40} color={colors.muted} />
        <Text style={styles.centerTitle}>This seller does not have a store</Text>
        <Text style={styles.centerText}>You can still find their listings in the marketplace.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (problem === 'network') {
    body = (
      <View style={styles.centerBox}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.muted} />
        <Text style={styles.centerTitle}>Sorry, that did not work</Text>
        <Text style={styles.centerText}>We could not load this store. Check your connection and try again.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => { setLoading(true); load(); }}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  } else {
    body = (
      <FlatList
        data={store.listings}
        keyExtractor={item => item.id}
        renderItem={renderTile}
        numColumns={2}
        columnWrapperStyle={styles.column}
        ListHeaderComponent={Header}
        contentContainerStyle={styles.list}
        initialNumToRender={6}
        windowSize={5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.centerTitle}>Nothing for sale yet</Text>
            <Text style={styles.centerText}>
              {isOwner ? 'Add your first listing and it will show up here.' : 'Check back soon.'}
            </Text>
          </View>
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isOwner ? 'My store' : 'Store'}</Text>
        <View style={styles.iconBtn} />
      </View>
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 4 },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
  list: { paddingBottom: 48 },
  column: { gap: 12, paddingHorizontal: 16, marginBottom: 16 },
  profile: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 8 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarLetter: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '600' },
  name: { fontSize: 24, fontWeight: '600', color: colors.text, marginTop: 8 },
  handle: { fontSize: 14, color: colors.muted },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locText: { fontSize: 14, color: colors.muted, maxWidth: 240 },
  about: { fontSize: 16, lineHeight: 24, color: colors.text, textAlign: 'center', marginTop: 4 },
  hint: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 8, minHeight: 48, paddingHorizontal: 24, marginTop: 8 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 8, minHeight: 44, paddingHorizontal: 16, borderWidth: 1.5, borderColor: colors.primary },
  secondaryBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  count: { alignSelf: 'flex-start', fontSize: 14, fontWeight: '500', color: colors.muted, marginTop: 16 },
  tilePhoto: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: colors.surface },
  tileNoPhoto: { justifyContent: 'center', alignItems: 'center' },
  tileTitle: { fontSize: 14, color: colors.text, marginTop: 8 },
  tilePrice: { fontSize: 14, fontWeight: '600', color: colors.primary, marginTop: 4 },
  centerBox: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 32, gap: 12 },
  emptyBox: { alignItems: 'center', paddingTop: 16, paddingHorizontal: 32, gap: 8 },
  centerTitle: { fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center' },
  centerText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  skelWrap: { alignItems: 'center', paddingTop: 24, gap: 12 },
  skelAvatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.surface },
  skelLine: { height: 14, borderRadius: 8, backgroundColor: colors.surface },
  skelRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  skelTile: { aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: colors.surface },
});
