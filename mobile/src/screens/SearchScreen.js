import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';

const COCOA = '#7B4F2E';

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const handleSearch = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) { setResults(null); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(text.trim())}`);
        setResults(res.data.results);
      } catch (err) { console.error('Search error:', err.message); }
      finally { setLoading(false); }
    }, 400);
  };

  const parseImgs = (imgs) => { if (!imgs) return []; if (Array.isArray(imgs)) return imgs.filter(Boolean); return imgs.replace(/[{}"]/g, '').split(',').map(s => s.trim()).filter(Boolean); };

  const renderSection = (title, data, renderItem, color) => {
    if (!data || data.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={[styles.sectionHeader, { borderLeftColor: color }]}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionCount}>{data.length}</Text>
        </View>
        {data.map(renderItem)}
      </View>
    );
  };

  const renderEvent = (item) => (
    <View key={item.id} style={styles.card}>
      {item.cover_url && <Image source={{ uri: item.cover_url }} style={styles.cardCover} />}
      <View style={styles.cardBody}>
        <View style={[styles.typeBadge, { backgroundColor: '#22C55E' }]}><Text style={styles.typeBadgeText}>📅 EVENT</Text></View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardMeta}>📍 {item.location_name || 'TBA'}</Text>
        <Text style={[styles.priceTag, { color: item.is_free ? '#22C55E' : '#F59E0B' }]}>{item.is_free ? '🟢 Free' : `💰 KES ${item.price}`}</Text>
      </View>
    </View>
  );

  const renderRental = (item) => {
    const imgs = parseImgs(item.images);
    return (
      <View key={item.id} style={styles.card}>
        {imgs.length > 0 && <Image source={{ uri: imgs[0] }} style={styles.cardCover} />}
        <View style={styles.cardBody}>
          <View style={[styles.typeBadge, { backgroundColor: '#F59E0B' }]}><Text style={styles.typeBadgeText}>🏠 RENTAL</Text></View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardMeta}>📍 {item.area_name || item.location_name || 'TBA'}</Text>
          <Text style={[styles.priceTag, { color: '#F59E0B' }]}>KES {item.rent_amount}/mo</Text>
        </View>
      </View>
    );
  };

  const renderListing = (item) => {
    const imgs = parseImgs(item.images);
    return (
      <View key={item.id} style={styles.card}>
        {imgs.length > 0 && <Image source={{ uri: imgs[0] }} style={styles.cardCover} />}
        <View style={styles.cardBody}>
          <View style={[styles.typeBadge, { backgroundColor: '#7C3AED' }]}><Text style={styles.typeBadgeText}>🛍️ LISTING</Text></View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardMeta}>👤 @{item.seller_username}</Text>
          <Text style={[styles.priceTag, { color: '#22C55E' }]}>{item.price_type === 'free' ? 'FREE' : `KES ${item.price}`}</Text>
        </View>
      </View>
    );
  };

  const renderCommunity = (item) => (
    <TouchableOpacity key={item.id} style={styles.rowCard} onPress={() => navigation.navigate('CommunityChat', { community: item })}>
      {item.avatar_url ? <Image source={{ uri: item.avatar_url }} style={styles.rowAvatar} /> : <View style={[styles.rowAvatar, { backgroundColor: COCOA, justifyContent: 'center', alignItems: 'center' }]}><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{item.name.charAt(0)}</Text></View>}
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle}>{item.name}</Text>
        <Text style={styles.rowMeta}>👥 {item.member_count} members</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#64748B" />
    </TouchableOpacity>
  );

  const renderUser = (item) => (
    <TouchableOpacity key={item.id} style={styles.rowCard} onPress={() => navigation.navigate('UserProfile', { userId: item.id, username: item.username })}>
      {item.avatar_url ? <Image source={{ uri: item.avatar_url }} style={styles.rowAvatar} /> : <View style={[styles.rowAvatar, { backgroundColor: COCOA, justifyContent: 'center', alignItems: 'center' }]}><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{(item.full_name || item.username).charAt(0)}</Text></View>}
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle}>{item.full_name || item.username}</Text>
        <Text style={styles.rowMeta}>@{item.username}{item.is_seller ? ' · 🛍️ Seller' : ''}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#64748B" />
    </TouchableOpacity>
  );

  const hasResults = results && (results.events.length > 0 || results.listings.length > 0 || results.communities.length > 0 || results.users.length > 0 || results.rentals.length > 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>🔍 Search</Text></View>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color="#64748B" />
        <TextInput style={styles.searchInput} placeholder="Search events, homes, listings, people..." placeholderTextColor="#64748B" value={query} onChangeText={handleSearch} autoFocus />
        {query.length > 0 && <TouchableOpacity onPress={() => { setQuery(''); setResults(null); }}><Ionicons name="close-circle" size={18} color="#64748B" /></TouchableOpacity>}
      </View>
      {loading && <View style={styles.loadingRow}><ActivityIndicator color="#22C55E" size="small" /><Text style={styles.loadingText}>Searching...</Text></View>}
      <FlatList data={[1]} keyExtractor={() => 'search'} renderItem={() => (
        <View>
          {!results && !loading && <View style={styles.empty}><Text style={styles.emptyIcon}>🔍</Text><Text style={styles.emptyText}>Search Wesoxch</Text><Text style={styles.emptySubText}>Find events, homes, listings, communities and people</Text></View>}
          {results && !hasResults && <View style={styles.empty}><Text style={styles.emptyIcon}>😕</Text><Text style={styles.emptyText}>No results for "{query}"</Text></View>}
          {results && (
            <>
              {renderSection('Events', results.events, renderEvent, '#22C55E')}
              {renderSection('Rentals 🏠', results.rentals, renderRental, '#F59E0B')}
              {renderSection('Marketplace', results.listings, renderListing, '#7C3AED')}
              {renderSection('Communities', results.communities, renderCommunity, COCOA)}
              {renderSection('People', results.users, renderUser, '#3B82F6')}
            </>
          )}
        </View>
      )} contentContainerStyle={styles.list} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 14, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#334155', gap: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  loadingText: { color: '#94A3B8', fontSize: 13 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 3, paddingLeft: 10, marginBottom: 10 },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sectionCount: { color: '#64748B', fontSize: 12 },
  card: { backgroundColor: '#1E293B', borderRadius: 14, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  cardCover: { width: '100%', height: 140, resizeMode: 'cover' },
  cardBody: { padding: 12 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8 },
  typeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 6 },
  cardMeta: { color: '#94A3B8', fontSize: 12, marginBottom: 2 },
  priceTag: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  rowCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  rowAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  rowInfo: { flex: 1 },
  rowTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  rowMeta: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  emptySubText: { color: '#94A3B8', fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 20 },
});
