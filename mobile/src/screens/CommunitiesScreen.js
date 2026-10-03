import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, SafeAreaView, Alert, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';

const COCOA = '#7B4F2E';

export default function CommunitiesScreen({ navigation }) {
  const [myCommunities, setMyCommunities] = useState([]);
  const [allCommunities, setAllCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [joining, setJoining] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    fetchAll();
    const unsubscribe = navigation.addListener('focus', fetchAll);
    return unsubscribe;
  }, [navigation]);

  const fetchAll = async () => {
    try {
      const [myRes, allRes] = await Promise.all([api.get('/communities/my/joined'), api.get('/communities?limit=50')]);
      const mine = myRes.data.communities || [];
      const all = allRes.data.communities || [];
      setMyCommunities(mine);
      const myIds = new Set(mine.map(c => c.id));
      setAllCommunities(all.filter(c => !myIds.has(c.id)));
      const counts = {};
      await Promise.all(mine.map(async (c) => {
        try { const r = await api.get(`/chat/unread/${c.id}`); counts[c.id] = r.data.count || 0; } catch (e) { counts[c.id] = 0; }
      }));
      setUnreadCounts(counts);
    } catch (err) { console.error('Communities error:', err.message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleJoin = async (community) => {
    setJoining(community.id);
    try {
      await api.post(`/communities/${community.id}/join`);
      Alert.alert('Joined!', `Welcome to ${community.name}!`);
      fetchAll();
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not join';
      if (msg === 'Already a member') navigation.navigate('CommunityChat', { community });
      else Alert.alert('Error', msg);
    } finally { setJoining(null); }
  };

  const renderMyComm = (item) => {
    const unread = unreadCounts[item.id] || 0;
    return (
      <TouchableOpacity key={item.id} style={styles.myCard} onPress={() => navigation.navigate('CommunityChat', { community: item })} activeOpacity={0.8}>
        <View style={styles.myAvatarWrap}>
          {item.avatar_url ? <Image source={{ uri: item.avatar_url }} style={styles.myAvatar} /> : <View style={styles.myAvatarPlaceholder}><Text style={styles.myAvatarText}>{item.name.charAt(0).toUpperCase()}</Text></View>}
          {unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text></View>}
        </View>
        <Text style={styles.myCardName} numberOfLines={1}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  const renderDiscover = ({ item }) => (
    <View style={styles.discoverCard}>
      <View style={styles.discoverTop}>
        {item.avatar_url ? <Image source={{ uri: item.avatar_url }} style={styles.discoverAvatar} /> : <View style={styles.discoverAvatarPlaceholder}><Text style={styles.discoverAvatarText}>{item.name.charAt(0).toUpperCase()}</Text></View>}
        <View style={styles.discoverInfo}>
          <Text style={styles.discoverName}>{item.name}</Text>
          <Text style={styles.discoverType}>{item.type?.toUpperCase()}</Text>
        </View>
        <TouchableOpacity style={styles.joinBtn} onPress={() => handleJoin(item)} disabled={joining === item.id}>
          {joining === item.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.joinBtnText}>Join</Text>}
        </TouchableOpacity>
      </View>
      {item.description ? <Text style={styles.discoverDesc} numberOfLines={2}>{item.description}</Text> : null}
      <View style={styles.discoverMeta}>
        <Text style={styles.metaText}>👥 {item.member_count} members</Text>
        {item.location_name && <Text style={styles.metaText}>📍 {item.location_name}</Text>}
      </View>
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COCOA} /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👥 Communities</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateCommunity')}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={allCommunities}
        keyExtractor={(item) => item.id}
        renderItem={renderDiscover}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={COCOA} />}
        ListHeaderComponent={
          <>
            {myCommunities.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>My Communities</Text>
                <FlatList data={myCommunities} keyExtractor={(item) => item.id} renderItem={({ item }) => renderMyComm(item)} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.myList} />
              </View>
            )}
            <View style={styles.searchBox}>
              <TextInput style={styles.searchInput} placeholder="Search communities..." placeholderTextColor="#64748B" value={search} onChangeText={setSearch} />
            </View>
            {allCommunities.length > 0 && <Text style={styles.sectionTitle}>Discover</Text>}
          </>
        }
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No communities found</Text><Text style={styles.emptySubText}>Tap + to create one!</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  createBtn: { backgroundColor: COCOA, borderRadius: 10, padding: 8 },
  section: { marginBottom: 16 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', paddingHorizontal: 16, marginBottom: 12 },
  myList: { paddingHorizontal: 16, gap: 12 },
  myCard: { width: 80, alignItems: 'center', gap: 6 },
  myAvatarWrap: { position: 'relative' },
  myAvatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: COCOA },
  myAvatarPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: COCOA, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#A0522D' },
  myAvatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  myCardName: { color: '#fff', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#22C55E', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, borderWidth: 2, borderColor: '#0F172A' },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  searchBox: { paddingHorizontal: 16, marginBottom: 16 },
  searchInput: { backgroundColor: '#1E293B', color: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, borderWidth: 1, borderColor: '#334155' },
  list: { paddingBottom: 24 },
  discoverCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 14, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  discoverTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  discoverAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  discoverAvatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: COCOA, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  discoverAvatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  discoverInfo: { flex: 1 },
  discoverName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  discoverType: { fontSize: 10, color: '#94A3B8', marginTop: 2, letterSpacing: 1 },
  joinBtn: { backgroundColor: COCOA, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  joinBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  discoverDesc: { fontSize: 13, color: '#94A3B8', marginBottom: 8 },
  discoverMeta: { flexDirection: 'row', gap: 12 },
  metaText: { fontSize: 12, color: '#64748B' },
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  emptySubText: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
});
