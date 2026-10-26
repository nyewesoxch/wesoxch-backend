import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import api from '../api/client';

const parseImgs = (imgs) => {
  if (!imgs) return [];
  if (Array.isArray(imgs)) return imgs.filter(Boolean);
  return imgs.replace(/[{}"]/g,'').split(',').map(s=>s.trim()).filter(Boolean);
};

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
      } catch {}
      finally { setLoading(false); }
    }, 400);
  };

  const hasResults = results && Object.values(results).some(arr => arr.length > 0);

  const Section = ({ title, data, color, renderItem }) => {
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔍 Search</Text>
      </View>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Events, homes, listings, people..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={handleSearch}
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults(null); }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}
      <FlatList
        data={[1]}
        keyExtractor={() => 'search'}
        contentContainerStyle={styles.list}
        renderItem={() => (
          <View>
            {!results && !loading && (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyTitle}>Search Wesoxch</Text>
                <Text style={styles.emptyDesc}>Find events, homes, listings, communities and people</Text>
              </View>
            )}
            {results && !hasResults && (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>😕</Text>
                <Text style={styles.emptyTitle}>No results for "{query}"</Text>
              </View>
            )}
            {results && (
              <>
                <Section title="📅 Events" data={results.events} color={colors.green}
                  renderItem={item => (
                    <View key={item.id} style={styles.card}>
                      {item.cover_url && <Image source={{ uri: item.cover_url }} style={styles.cardImg} />}
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardMeta}>📍 {item.location_name || 'TBA'}</Text>
                        <Text style={[styles.cardPrice, { color: item.is_free ? colors.green : colors.amber }]}>{item.is_free ? 'Free' : `KES ${item.price}`}</Text>
                      </View>
                    </View>
                  )}
                />
                <Section title="🏠 Rentals" data={results.rentals} color={colors.amber}
                  renderItem={item => {
                    const imgs = parseImgs(item.images);
                    return (
                      <View key={item.id} style={styles.card}>
                        {imgs[0] && <Image source={{ uri: imgs[0] }} style={styles.cardImg} />}
                        <View style={styles.cardInfo}>
                          <Text style={styles.cardTitle}>{item.title}</Text>
                          <Text style={styles.cardMeta}>📍 {item.area_name || item.location_name || 'TBA'}</Text>
                          <Text style={[styles.cardPrice, { color: colors.amber }]}>KES {item.rent_amount}/mo</Text>
                        </View>
                      </View>
                    );
                  }}
                />
                <Section title="🛍️ Listings" data={results.listings} color={colors.market}
                  renderItem={item => {
                    const imgs = parseImgs(item.images);
                    return (
                      <View key={item.id} style={styles.card}>
                        {imgs[0] && <Image source={{ uri: imgs[0] }} style={styles.cardImg} />}
                        <View style={styles.cardInfo}>
                          <Text style={styles.cardTitle}>{item.title}</Text>
                          <Text style={styles.cardMeta}>@{item.seller_username}</Text>
                          <Text style={[styles.cardPrice, { color: colors.green }]}>{item.price_type === 'free' ? 'FREE' : `KES ${item.price}`}</Text>
                        </View>
                      </View>
                    );
                  }}
                />
                <Section title="👥 Communities" data={results.communities} color={colors.purple}
                  renderItem={item => (
                    <TouchableOpacity key={item.id} style={styles.rowCard} onPress={() => navigation.navigate('CommunityChat', { community: item })}>
                      <View style={styles.rowAvatar}><Text style={{ fontSize: 20 }}>👥</Text></View>
                      <View style={styles.rowInfo}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <Text style={styles.cardMeta}>{item.member_count} members</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                />
                <Section title="👤 People" data={results.users} color={colors.blue}
                  renderItem={item => (
                    <TouchableOpacity key={item.id} style={styles.rowCard} onPress={() => navigation.navigate('UserProfile', { userId: item.id })}>
                      {item.avatar_url
                        ? <Image source={{ uri: item.avatar_url }} style={styles.rowAvatarImg} />
                        : <View style={styles.rowAvatar}><Text style={{ fontSize: 20 }}>👤</Text></View>
                      }
                      <View style={styles.rowInfo}>
                        <Text style={styles.cardTitle}>{item.full_name || item.username}</Text>
                        <Text style={styles.cardMeta}>@{item.username}{item.is_seller ? ' · Seller' : ''}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                />
              </>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgElevated, borderRadius: 14, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, gap: 10 },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 15 },
  loadingRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  loadingText: { color: colors.textSecondary, fontSize: 13 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 3, paddingLeft: 10, marginBottom: 10 },
  sectionTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  sectionCount: { color: colors.textMuted, fontSize: 12 },
  card: { flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: 14, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  cardImg: { width: 80, height: 80 },
  cardInfo: { flex: 1, padding: 10, justifyContent: 'center', gap: 4 },
  cardTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  cardMeta: { color: colors.textSecondary, fontSize: 12 },
  cardPrice: { fontSize: 13, fontWeight: '700' },
  rowCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border, gap: 12 },
  rowAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgElevated, justifyContent: 'center', alignItems: 'center' },
  rowAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  rowInfo: { flex: 1 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  emptyDesc: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
