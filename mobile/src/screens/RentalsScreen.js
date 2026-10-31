import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, TextInput, ScrollView, Linking, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import api from '../api/client';

const TYPES = ['all', 'bedsitter', 'single_room', 'one_bedroom', 'two_bedroom', 'three_bedroom', 'studio'];

// Kept in memory so coming back to this screen shows the list straight away
let cachedRentals = null;

const toList = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return String(v).replace(/[{}"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
};

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.skelImage} />
      <View style={styles.cardBody}>
        <View style={[styles.skelLine, { width: '65%' }]} />
        <View style={[styles.skelLine, { width: '35%' }]} />
        <View style={[styles.skelLine, { width: '80%' }]} />
      </View>
    </View>
  );
}

export default function RentalsScreen({ navigation }) {
  const [rentals, setRentals] = useState(cachedRentals || []);
  const [loading, setLoading] = useState(!cachedRentals);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [propType, setPropType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const filters = useRef({});
  filters.current = { search, minPrice, maxPrice, propType };

  const load = useCallback(async () => {
    const f = filters.current;
    const params = { limit: 20 };
    if (f.search.trim()) params.search = f.search.trim();
    if (f.minPrice) params.min_price = f.minPrice;
    if (f.maxPrice) params.max_price = f.maxPrice;
    if (f.propType !== 'all') params.property_type = f.propType;
    try {
      const res = await api.get('/rentals', { params });
      const list = res.data.rentals || [];
      setRentals(list);
      setError('');
      if (Object.keys(params).length === 1) cachedRentals = list;
    } catch (e) {
      setError(e.response?.data?.message || 'We could not load rentals. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const contact = (item) => {
    let number = (item.landlord_whatsapp || item.landlord_phone || '').replace(/[^0-9]/g, '');
    if (!number) { Alert.alert('No contact number', 'This landlord has not added a number.'); return; }
    if (number.startsWith('0')) number = '254' + number.slice(1);
    Linking.openURL(`https://wa.me/${number}`).catch(() =>
      Alert.alert('Could not open WhatsApp', `You can call or message ${item.landlord_phone || item.landlord_whatsapp}.`));
  };

  const renderItem = ({ item }) => {
    const photos = toList(item.images);
    return (
      <View style={styles.card}>
        {photos.length > 0 ? (
          <View>
            <Image
              source={{ uri: photos[0] }}
              style={styles.photo}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
              recyclingKey={item.id}
            />
            {photos.length > 1 && (
              <View style={styles.photoCount}>
                <Ionicons name="images-outline" size={14} color="#fff" />
                <Text style={styles.photoCountText}>{photos.length}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.photo, styles.noPhoto]}>
            <Ionicons name="home-outline" size={32} color={colors.muted} />
          </View>
        )}
        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            <View style={styles.priceBox}>
              <Text style={styles.price}>KES {Number(item.rent_amount).toLocaleString()}</Text>
              <Text style={styles.perMonth}>per month</Text>
            </View>
          </View>
          <Text style={styles.type}>{(item.property_type || '').replace(/_/g, ' ')}</Text>
          <View style={styles.factsRow}>
            {item.bedrooms > 0 && (
              <View style={styles.fact}>
                <Ionicons name="bed-outline" size={16} color={colors.muted} />
                <Text style={styles.factText}>{item.bedrooms}</Text>
              </View>
            )}
            {item.bathrooms > 0 && (
              <View style={styles.fact}>
                <Ionicons name="water-outline" size={16} color={colors.muted} />
                <Text style={styles.factText}>{item.bathrooms}</Text>
              </View>
            )}
            {!!item.area_name && (
              <View style={styles.fact}>
                <Ionicons name="location-outline" size={16} color={colors.muted} />
                <Text style={styles.factText} numberOfLines={1}>{item.area_name}</Text>
              </View>
            )}
          </View>
          <View style={styles.footer}>
            <Text style={styles.landlord} numberOfLines={1}>@{item.landlord_username || 'landlord'}</Text>
            <TouchableOpacity style={styles.contactBtn} onPress={() => contact(item)} accessibilityLabel="Contact landlord on WhatsApp">
              <Ionicons name="logo-whatsapp" size={16} color="#fff" />
              <Text style={styles.contactText}>Contact</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rentals</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('CreateRental')} accessibilityLabel="List a rental">
          <Ionicons name="add-circle" size={30} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by area or title"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => { setLoading(true); load(); }}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(v => !v)} accessibilityLabel="Filters">
          <Ionicons name="options-outline" size={22} color={showFilters ? colors.primary : colors.muted} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filters}>
          <Text style={styles.filterLabel}>Rent per month (KES)</Text>
          <View style={styles.priceRow}>
            <TextInput style={styles.priceInput} placeholder="Min" placeholderTextColor={colors.muted} value={minPrice} onChangeText={setMinPrice} keyboardType="numeric" />
            <TextInput style={styles.priceInput} placeholder="Max" placeholderTextColor={colors.muted} value={maxPrice} onChangeText={setMaxPrice} keyboardType="numeric" />
          </View>
          <Text style={styles.filterLabel}>Type of place</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {TYPES.map(t => (
                <TouchableOpacity key={t} style={[styles.chip, propType === t && styles.chipActive]} onPress={() => setPropType(t)}>
                  <Text style={[styles.chipText, propType === t && styles.chipTextActive]}>
                    {t === 'all' ? 'All' : t.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => { setShowFilters(false); setLoading(true); load(); }}>
            <Text style={styles.primaryBtnText}>Show results</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.list}>{[0, 1, 2].map(i => <SkeletonCard key={i} />)}</View>
      ) : error && rentals.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="cloud-offline-outline" size={32} color={colors.muted} />
          <Text style={styles.centerTitle}>Sorry, that did not work</Text>
          <Text style={styles.centerText}>{error}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => { setLoading(true); load(); }}>
            <Text style={styles.primaryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rentals}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Ionicons name="home-outline" size={32} color={colors.muted} />
              <Text style={styles.centerTitle}>Nothing nearby yet</Text>
              <Text style={styles.centerText}>Be the first to list a place for rent.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('CreateRental')}>
                <Text style={styles.primaryBtnText}>List a place</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 4 },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 12, minHeight: 44 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: 8 },
  filterBtn: { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  filters: { backgroundColor: colors.surface, marginHorizontal: 16, borderRadius: 12, padding: 16, marginBottom: 8, gap: 8 },
  filterLabel: { fontSize: 12, color: colors.muted },
  priceRow: { flexDirection: 'row', gap: 8 },
  priceInput: { flex: 1, backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 12, minHeight: 44, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 12, minHeight: 36, justifyContent: 'center', borderRadius: 999, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.muted },
  chipTextActive: { color: '#fff', fontWeight: '500' },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 8, minHeight: 44, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  card: { backgroundColor: colors.background, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  photo: { width: '100%', height: 180, backgroundColor: colors.surface },
  noPhoto: { justifyContent: 'center', alignItems: 'center' },
  photoCount: { position: 'absolute', right: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(17,20,23,0.7)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  photoCountText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  cardBody: { padding: 12, gap: 8 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  priceBox: { alignItems: 'flex-end' },
  price: { fontSize: 16, fontWeight: '600', color: colors.primary },
  perMonth: { fontSize: 12, color: colors.muted },
  type: { fontSize: 12, color: colors.muted, textTransform: 'capitalize' },
  factsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  factText: { fontSize: 14, color: colors.muted, maxWidth: 160 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  landlord: { flex: 1, fontSize: 14, color: colors.muted },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 999, minHeight: 44, paddingHorizontal: 16 },
  contactText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  skelImage: { height: 180, backgroundColor: colors.surface },
  skelLine: { height: 14, borderRadius: 8, backgroundColor: colors.surface },
  centerBox: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32, gap: 8 },
  centerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  centerText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
});
