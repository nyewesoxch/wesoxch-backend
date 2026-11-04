import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { colors } from '../theme/colors';
import api from '../api/client';

export default function BlockedPeopleScreen({ navigation }) {
  const [people, setPeople] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/moderation/blocks');
      setPeople(res.data.blocked || []);
      setError('');
    } catch {
      setError('We could not load this list. Check your connection and try again.');
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const unblock = async (person) => {
    setBusyId(person.id);
    try {
      await api.delete(`/moderation/blocks/${person.id}`);
      setPeople(list => list.filter(p => p.id !== person.id));
    } catch (e) {
      Alert.alert('Sorry, we could not unblock them', e.response?.data?.message || 'Check your connection and try again.');
    } finally {
      setBusyId(null);
    }
  };

  let body;
  if (people === null && !error) {
    body = (
      <View style={styles.list}>
        {[0, 1, 2].map(i => (
          <View key={i} style={styles.skelRow}>
            <View style={styles.skelCircle} />
            <View style={styles.skelLine} />
          </View>
        ))}
      </View>
    );
  } else if (people === null) {
    body = (
      <View style={styles.centerBox}>
        <Ionicons name="cloud-offline-outline" size={32} color={colors.muted} />
        <Text style={styles.centerTitle}>Sorry, that did not work</Text>
        <Text style={styles.centerText}>{error}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={load}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  } else {
    body = (
      <FlatList
        data={people}
        keyExtractor={p => p.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          people.length > 0 ? (
            <Text style={styles.intro}>You do not see messages from these people in community chats.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar uri={item.avatar_url} name={item.full_name || item.username} size={44} />
            <View style={styles.names}>
              <Text style={styles.name} numberOfLines={1}>{item.full_name || item.username}</Text>
              <Text style={styles.handle} numberOfLines={1}>@{item.username}</Text>
            </View>
            <TouchableOpacity
              style={styles.unblockBtn}
              onPress={() => unblock(item)}
              disabled={busyId === item.id}
              accessibilityLabel={`Unblock ${item.username}`}
            >
              {busyId === item.id
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={styles.unblockText}>Unblock</Text>}
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.centerBox}>
            <Ionicons name="shield-checkmark-outline" size={32} color={colors.muted} />
            <Text style={styles.centerTitle}>You have not blocked anyone</Text>
            <Text style={styles.centerText}>
              If someone bothers you in a chat, tap the three dots on their message to block them. They will show up here.
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
        <Text style={styles.headerTitle}>Blocked people</Text>
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
  list: { padding: 16, gap: 12 },
  intro: { fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 12, padding: 12 },
  names: { flex: 1 },
  name: { fontSize: 16, fontWeight: '500', color: colors.text },
  handle: { fontSize: 14, color: colors.muted },
  unblockBtn: { minHeight: 44, minWidth: 88, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary },
  unblockText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  centerBox: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 32, gap: 12 },
  centerTitle: { fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center' },
  centerText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 8, minHeight: 44, paddingHorizontal: 24, justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  skelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 12, padding: 12 },
  skelCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border },
  skelLine: { flex: 1, height: 14, borderRadius: 8, backgroundColor: colors.border },
});
