import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { colors } from '../theme/colors';
import api from '../api/client';

export default function CommunityMembersScreen({ route, navigation }) {
  const { community } = route.params;
  const [members, setMembers] = useState(null);
  const [problem, setProblem] = useState(null); // 'locked' = not a member, 'network' = could not reach the server

  const load = () => {
    setProblem(null);
    api.get(`/communities/${community.id}/members`)
      .then(res => setMembers(res.data.members || []))
      .catch(e => setProblem(e.response?.status === 403 ? 'locked' : 'network'));
  };
  useEffect(load, []);

  let body;
  if (problem === 'locked') {
    body = (
      <View style={styles.centerBox}>
        <Ionicons name="lock-closed-outline" size={32} color={colors.muted} />
        <Text style={styles.centerTitle}>Members are visible to members</Text>
        <Text style={styles.centerText}>Join this community to see who is in it.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (problem === 'network') {
    body = (
      <View style={styles.centerBox}>
        <Ionicons name="cloud-offline-outline" size={32} color={colors.muted} />
        <Text style={styles.centerTitle}>Sorry, that did not work</Text>
        <Text style={styles.centerText}>We could not load the members. Check your connection and try again.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={load}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (members === null) {
    body = <View style={styles.centerBox}><ActivityIndicator color={colors.primary} /></View>;
  } else {
    body = (
      <FlatList
        data={members}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
            accessibilityLabel={`View ${item.username}`}
          >
            <Avatar uri={item.avatar_url} name={item.full_name || item.username} size={46} />
            <View style={styles.names}>
              <Text style={styles.name} numberOfLines={1}>{item.full_name || item.username}</Text>
              <Text style={styles.handle} numberOfLines={1}>@{item.username}</Text>
            </View>
            {item.role === 'admin' && (
              <View style={styles.badge}><Text style={styles.badgeText}>Admin</Text></View>
            )}
          </TouchableOpacity>
        )}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{community.name}</Text>
          {members !== null && <Text style={styles.headerSub}>{members.length} {members.length === 1 ? 'member' : 'members'}</Text>}
        </View>
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  headerSub: { fontSize: 12, color: colors.muted },
  list: { padding: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 12, padding: 12, minHeight: 64 },
  names: { flex: 1 },
  name: { fontSize: 16, fontWeight: '500', color: colors.text },
  handle: { fontSize: 14, color: colors.muted },
  badge: { backgroundColor: colors.background, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: colors.primary },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  centerBox: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 32, gap: 12 },
  centerTitle: { fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center' },
  centerText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 8, minHeight: 44, paddingHorizontal: 24, justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
