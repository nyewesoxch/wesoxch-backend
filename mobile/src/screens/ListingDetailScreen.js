import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  Linking, Alert, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import api from '../api/client';

const toList = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return String(v).replace(/[{}"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
};

const PRICE_NOTE = { negotiable: 'Negotiable', hourly: 'Per hour' };

export default function ListingDetailScreen({ route, navigation }) {
  const { listing: initial } = route.params;
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [listing, setListing] = useState({ ...initial, images: toList(initial.images) });
  const [page, setPage] = useState(0);

  useEffect(() => {
    api.get(`/listings/${initial.id}`)
      .then(res => {
        const l = res.data.listing;
        setListing(prev => ({ ...prev, ...l, images: toList(l.images) }));
      })
      .catch(() => {});
  }, [initial.id]);

  const isOwner = listing.created_by === user?.id;
  const sellerName = listing.seller_name || listing.seller_username || 'Seller';
  const priceText = listing.price_type === 'free' ? 'Free' : `KES ${Number(listing.price).toLocaleString()}`;

  const contact = () => {
    let n = (listing.seller_whatsapp || listing.seller_phone || '').replace(/[^0-9]/g, '');
    if (!n) { Alert.alert('No contact number', 'This seller has not added a number yet.'); return; }
    if (n.startsWith('0')) n = '254' + n.slice(1);
    Linking.openURL(`https://wa.me/${n}`).catch(() =>
      Alert.alert('Could not open WhatsApp', 'You can contact the seller on the number in their profile.'));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Listing</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {listing.images.length > 0 ? (
          <View>
            <FlatList
              data={listing.images}
              keyExtractor={(u, i) => `${u}-${i}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={e => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={{ width, aspectRatio: 4 / 3 }} contentFit="cover" transition={150} />
              )}
            />
            {listing.images.length > 1 && (
              <View style={styles.counter}>
                <Text style={styles.counterText}>{page + 1} / {listing.images.length}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.noPhoto, { width, aspectRatio: 4 / 3 }]}>
            <Ionicons name="image-outline" size={40} color={colors.muted} />
          </View>
        )}

        <View style={styles.body}>
          <Text style={styles.price}>{priceText}</Text>
          {!!PRICE_NOTE[listing.price_type] && <Text style={styles.priceNote}>{PRICE_NOTE[listing.price_type]}</Text>}
          <Text style={styles.title}>{listing.title}</Text>

          <View style={styles.metaRow}>
            {!!listing.category && (
              <View style={styles.pill}><Text style={styles.pillText}>{listing.category}</Text></View>
            )}
            {!!listing.location_name && (
              <View style={styles.meta}>
                <Ionicons name="location-outline" size={16} color={colors.muted} />
                <Text style={styles.metaText} numberOfLines={1}>{listing.location_name}</Text>
              </View>
            )}
          </View>

          {!!listing.description && <Text style={styles.description}>{listing.description}</Text>}

          <TouchableOpacity
            style={styles.sellerRow}
            onPress={() => listing.created_by && navigation.navigate('UserProfile', { userId: listing.created_by })}
            accessibilityLabel={`View ${sellerName}'s profile`}
          >
            <View style={styles.sellerAvatar}>
              <Text style={styles.sellerAvatarText}>{sellerName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerName} numberOfLines={1}>{sellerName}</Text>
              <Text style={styles.sellerSub}>See their profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </TouchableOpacity>

          {listing.seller_premium && !!listing.seller_username && (
            <TouchableOpacity
              style={styles.storeBtn}
              onPress={() => navigation.navigate('Store', { username: listing.seller_username })}
              accessibilityLabel={`Visit ${sellerName}'s store`}
            >
              <Ionicons name="storefront-outline" size={20} color={colors.primary} />
              <Text style={styles.storeBtnText} numberOfLines={1}>More from {sellerName}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
          {!isOwner && (
            <TouchableOpacity style={styles.contactBtn} onPress={contact} accessibilityLabel="Contact the seller on WhatsApp">
              <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              <Text style={styles.contactText}>Message the seller</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 4 },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
  scroll: { paddingBottom: 48 },
  counter: { position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(17,20,23,0.7)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  counterText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  noPhoto: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  body: { padding: 16, gap: 12 },
  price: { fontSize: 24, fontWeight: '600', color: colors.primary },
  priceNote: { fontSize: 14, color: colors.muted, marginTop: -8 },
  title: { fontSize: 20, fontWeight: '600', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  pill: { backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  pillText: { fontSize: 12, color: colors.text, textTransform: 'capitalize' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  metaText: { fontSize: 14, color: colors.muted, flexShrink: 1 },
  description: { fontSize: 16, lineHeight: 24, color: colors.text },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 12, padding: 12, minHeight: 56 },
  sellerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  sellerAvatarText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sellerName: { fontSize: 16, fontWeight: '500', color: colors.text },
  sellerSub: { fontSize: 12, color: colors.muted },
  storeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, minHeight: 48, paddingHorizontal: 16, borderWidth: 1.5, borderColor: colors.primary },
  storeBtnText: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.primary },
  contactBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 8, minHeight: 48 },
  contactText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
