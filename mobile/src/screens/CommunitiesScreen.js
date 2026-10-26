import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import api from '../api/client';

export default function CommunitiesScreen({ navigation }) {
  const [myCommunities, setMyCommunities] = useState([]);
  const [allCommunities, setAllCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => { fetchAll(); const u = navigation.addListener('focus', fetchAll); return u; }, [navigation]);

  const fetchAll = async () => {
    try {
      const [myRes, allRes] = await Promise.all([api.get('/communities/my/joined'), api.get('/communities?limit=50')]);
      const mine = myRes.data.communities || [];
      setMyCommunities(mine);
      const myIds = new Set(mine.map(c => c.id));
      setAllCommunities((allRes.data.communities || []).filter(c => !myIds.has(c.id)));
      const counts = {};
      await Promise.all(mine.map(async c => {
        try { const r = await api.get(`/chat/unread/${c.id}`); counts[c.id] = r.data.count || 0; } catch { counts[c.id] = 0; }
      }));
      setUnreadCounts(counts);
    } catch (err) { console.error(err.message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleJoin = async (community) => {
    setJoining(community.id);
    try {
      await api.post(`/communities/${community.id}/join`);
      Alert.alert('Joined!', `Welcome to ${community.name}!`);
      fetchAll();
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg === 'Already a member') navigation.navigate('CommunityChat', { community });
      else Alert.alert('Error', msg || 'Could not join');
    } finally { setJoining(null); }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👥 Communities</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CreateCommunity')}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={allCommunities}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <>
            {myCommunities.length > 0 && (
              <View style={styles.mySection}>
                <Text style={styles.sectionTitle}>My Communities</Text>
                <FlatList
                  horizontal showsHorizontalScrollIndicator={false}
                  data={myCommunities}
                  keyExtractor={item => item.id}
                  contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
                  renderItem={({ item }) => {
                    const unread = unreadCounts[item.id] || 0;
                    return (
                      <TouchableOpacity style={styles.myCard} onPress={() => navigation.navigate('CommunityChat', { community: item })}>
                        <View style={styles.myAvatarWrap}>
                          {item.avatar_url
                            ? <Image source={{ uri: item.avatar_url }} style={styles.myAvatar} />
                            : <View style={[styles.myAvatar, styles.myAvatarPlaceholder]}><Text style={styles.myAvatarText}>{item.name.charAt(0).toUpperCase()}</Text></View>
                          }
                          {unread > 0 && <View style={styles.unreadBadge}><Text style={styles.unreadText}>{unread > 9 ? '9+' : unread}</Text></View>}
                        </View>
                        <Text style={styles.myCardName} numberOfLines={1}>{item.name}</Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            )}
            {allCommunities.length > 0 && <Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginTop: 20 }]}>Discover</Text>}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.discoverCard}>
            <View style={styles.discoverTop}>
              {item.avatar_url
                ? <Image source={{ uri: item.avatar_url }} style={styles.discoverAvatar} />
                : <View style={[styles.discoverAvatar, styles.discoverAvatarPlaceholder]}><Text style={styles.discoverAvatarText}>{item.name.charAt(0).toUpperCase()}</Text></View>
              }
              <View style={styles.discoverInfo}>
                <Text style={styles.discoverName}>{item.name}</Text>
                <Text style={styles.discoverType}>{item.type?.toUpperCase()} · {item.member_count} members</Text>
              </View>
              <TouchableOpacity style={styles.joinBtn} onPress={() => handleJoin(item)} disabled={joining === item.id}>
                {joining === item.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.joinBtnText}>Join</Text>}
              </TouchableOpacity>
            </View>
            {item.description && <Text style={styles.discoverDesc} numberOfLines={2}>{item.description}</Text>}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>No communities yet</Text>
            <TouchableOpacity style={styles.createFirstBtn} onPress={() => navigation.navigate('CreateCommunity')}>
              <Text style={styles.createFirstBtnText}>Create the first one</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  mySection: { marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  myCard: { width: 72, alignItems: 'center', gap: 6 },
  myAvatarWrap: { position: 'relative' },
  myAvatar: { width: 60, height: 60, borderRadius: 30 },
  myAvatarPlaceholder: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  myAvatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  myCardName: { color: colors.textSecondary, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  unreadBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: colors.rose, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, borderWidth: 2, borderColor: colors.bg },
  unreadText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  list: { paddingBottom: 24 },
  discoverCard: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 14, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border, gap: 8 },
  discoverTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  discoverAvatar: { width: 48, height: 48, borderRadius: 24 },
  discoverAvatarPlaceholder: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  discoverAvatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  discoverInfo: { flex: 1 },
  discoverName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  discoverType: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  joinBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  joinBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  discoverDesc: { fontSize: 13, color: colors.textSecondary },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { color: colors.textSecondary, fontSize: 16 },
  createFirstBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  createFirstBtnText: { color: '#fff', fontWeight: '700' },
});
