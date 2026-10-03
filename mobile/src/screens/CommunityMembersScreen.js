import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';

const COCOA = '#7B4F2E';

export default function CommunityMembersScreen({ route, navigation }) {
  const { community } = route.params;
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/communities/${community.id}/members`)
      .then(res => setMembers(res.data.members || []))
      .catch(() => Alert.alert('Error', 'Could not load members'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COCOA} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{community.name}</Text>
          <Text style={styles.headerSub}>{members.length} members</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>
      <FlatList data={members} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('UserProfile', { userId: item.id, username: item.username })} activeOpacity={0.8}>
            {item.avatar_url
              ? <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
              : <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{(item.full_name || item.username).charAt(0).toUpperCase()}</Text></View>}
            <View style={styles.info}>
              <Text style={styles.name}>{item.full_name || item.username}</Text>
              <Text style={styles.username}>@{item.username}</Text>
            </View>
            <View style={styles.right}>
              {item.role === 'admin' && <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>Admin</Text></View>}
              <Ionicons name="chevron-forward" size={16} color="#64748B" />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No members yet</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerInfo: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: COCOA, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  info: { flex: 1 },
  name: { color: '#fff', fontSize: 15, fontWeight: '600' },
  username: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adminBadge: { backgroundColor: COCOA, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  adminBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#94A3B8', fontSize: 16 },
});
