import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, TextInput, Image, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';

const PROPERTY_TYPES = ['all','bedsitter','single_room','one_bedroom','two_bedroom','three_bedroom','studio'];

export default function RentalsScreen({ navigation }) {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [propertyType, setPropertyType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { fetchRentals(); }, []);

  const fetchRentals = async () => {
    try {
      let url = '/rentals?limit=30';
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (minPrice) url += `&min_price=${minPrice}`;
      if (maxPrice) url += `&max_price=${maxPrice}`;
      if (propertyType !== 'all') url += `&property_type=${propertyType}`;
      const res = await api.get(url);
      setRentals(res.data.rentals || []);
    } catch (err) { console.error('Rentals error:', err.message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleContact = (rental) => {
    const number = (rental.landlord_whatsapp || rental.landlord_phone || '').replace(/[^0-9]/g, '');
    if (!number) { Alert.alert('No contact', 'This landlord has not provided a contact number.'); return; }
    Linking.openURL(`whatsapp://send?phone=${number}`).catch(() => Alert.alert('Contact', `Call: ${rental.landlord_phone || rental.landlord_whatsapp}`));
  };

  const parseImages = (images) => {
    if (!images) return [];
    if (Array.isArray(images)) return images.filter(Boolean);
    return images.replace(/[{}"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
  };

  const renderRental = ({ item }) => {
    const imgs = parseImages(item.images);
    return (
      <View style={styles.card}>
        {imgs.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll} pagingEnabled>
            {imgs.map((img, i) => <Image key={i} source={{ uri: img }} style={styles.rentalImage} />)}
          </ScrollView>
        )}
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.propertyType}>{item.property_type?.replace(/_/g, ' ').toUpperCase()}</Text>
            </View>
            <View style={styles.priceBox}>
              <Text style={styles.priceText}>KES {item.rent_amount?.toLocaleString()}</Text>
              <Text style={styles.priceType}>/{item.payment_period || 'month'}</Text>
            </View>
          </View>
          {item.description ? <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
          <View style={styles.cardMetas}>
            {item.bedrooms && <Text style={styles.cardMeta}>🛏 {item.bedrooms} bed</Text>}
            {item.bathrooms && <Text style={styles.cardMeta}>🚿 {item.bathrooms} bath</Text>}
            {item.area_name && <Text style={styles.cardMeta}>📍 {item.area_name}</Text>}
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.landlordText}>👤 @{item.landlord_username || 'Landlord'}</Text>
            <TouchableOpacity style={styles.contactBtn} onPress={() => handleContact(item)}>
              <Ionicons name="logo-whatsapp" size={14} color="#fff" />
              <Text style={styles.contactBtnText}>Contact</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#F59E0B" /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>🏠 Rentals</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateRental')} style={styles.addBtn}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.searchBox}>
        <TextInput style={styles.searchInput} placeholder="Search by area, title..." placeholderTextColor="#64748B" value={search} onChangeText={setSearch} onSubmitEditing={fetchRentals} returnKeyType="search" />
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.filterToggle}>
          <Ionicons name="options-outline" size={20} color={showFilters ? '#F59E0B' : '#64748B'} />
        </TouchableOpacity>
      </View>
      {showFilters && (
        <View style={styles.filtersBox}>
          <Text style={styles.filterLabel}>Price Range (KES/month)</Text>
          <View style={styles.priceRow}>
            <TextInput style={[styles.priceInput, { marginRight: 8 }]} placeholder="Min" placeholderTextColor="#64748B" value={minPrice} onChangeText={setMinPrice} keyboardType="numeric" />
            <Text style={styles.priceDash}>—</Text>
            <TextInput style={[styles.priceInput, { marginLeft: 8 }]} placeholder="Max" placeholderTextColor="#64748B" value={maxPrice} onChangeText={setMaxPrice} keyboardType="numeric" />
          </View>
          <Text style={styles.filterLabel}>Property Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {PROPERTY_TYPES.map(pt => (
                <TouchableOpacity key={pt} style={[styles.typeChip, propertyType === pt && styles.typeChipActive]} onPress={() => setPropertyType(pt)}>
                  <Text style={[styles.typeChipText, propertyType === pt && styles.typeChipTextActive]}>{pt === 'all' ? 'All' : pt.replace(/_/g, ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.applyBtn} onPress={() => { fetchRentals(); setShowFilters(false); }}>
            <Text style={styles.applyBtnText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList data={rentals} keyExtractor={(item) => item.id} renderItem={renderRental} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRentals(); }} tintColor="#F59E0B" />}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No rentals found</Text><Text style={styles.emptySubText}>Be the first to list!</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  addBtn: { backgroundColor: '#F59E0B', borderRadius: 10, padding: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  searchInput: { flex: 1, backgroundColor: '#1E293B', color: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, borderWidth: 1, borderColor: '#334155' },
  filterToggle: { backgroundColor: '#1E293B', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#334155' },
  filtersBox: { backgroundColor: '#1E293B', marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  filterLabel: { color: '#94A3B8', fontSize: 12, marginBottom: 8, marginTop: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  priceInput: { flex: 1, backgroundColor: '#0F172A', color: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#334155' },
  priceDash: { color: '#94A3B8', fontSize: 16 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155' },
  typeChipActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  typeChipText: { color: '#94A3B8', fontSize: 12 },
  typeChipTextActive: { color: '#fff', fontWeight: '700' },
  applyBtn: { backgroundColor: '#F59E0B', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  applyBtnText: { color: '#fff', fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { backgroundColor: '#1E293B', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' },
  imageScroll: { height: 200 },
  rentalImage: { width: 320, height: 200, resizeMode: 'cover' },
  cardBody: { padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardInfo: { flex: 1, marginRight: 8 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  propertyType: { color: '#F59E0B', fontSize: 10, fontWeight: '700', marginTop: 2, letterSpacing: 1 },
  priceBox: { alignItems: 'flex-end' },
  priceText: { color: '#22C55E', fontSize: 16, fontWeight: '800' },
  priceType: { color: '#64748B', fontSize: 10 },
  cardDesc: { color: '#94A3B8', fontSize: 13, marginBottom: 8 },
  cardMetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  cardMeta: { color: '#64748B', fontSize: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  landlordText: { color: '#94A3B8', fontSize: 12 },
  contactBtn: { flexDirection: 'row', gap: 6, backgroundColor: '#166534', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  contactBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  emptySubText: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
});
