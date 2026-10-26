import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import api from '../api/client';

const TOPICS = ['Anxiety','Depression','Grief','Relationships','Work Stress','Self-esteem','Loneliness','Family','Other'];

export default function TherapyScreen({ navigation }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchRooms(); }, []);

  const fetchRooms = async () => {
    try { const res = await api.get('/therapy/rooms'); setRooms(res.data.rooms || []); }
    catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleJoin = async (room) => {
    try { await api.post(`/therapy/rooms/${room.id}/join`); } catch {}
    navigation.navigate('TherapyRoom', { room });
  };

  const handleCreate = async () => {
    if (!title) { Alert.alert('Required', 'Add a title'); return; }
    setCreating(true);
    try {
      const res = await api.post('/therapy/rooms', { title, topic, is_anonymous: true });
      setTitle(''); setTopic(''); setShowCreate(false);
      fetchRooms();
      navigation.navigate('TherapyRoom', { room: res.data.room });
    } catch { Alert.alert('Error', 'Could not create room.'); }
    finally { setCreating(false); }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.therapy} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>💙 Our Therapy</Text>
        <TouchableOpacity onPress={() => setShowCreate(!showCreate)}>
          <Ionicons name={showCreate ? 'close' : 'add'} size={24} color={colors.therapy} />
        </TouchableOpacity>
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>A safe space. Anonymous. No judgement. Just people helping people.</Text>
      </View>

      {showCreate && (
        <View style={styles.createBox}>
          <TextInput style={styles.createInput} value={title} onChangeText={setTitle} placeholder="Room title e.g. Dealing with anxiety" placeholderTextColor={colors.textMuted} />
          <View style={styles.topicWrap}>
            {TOPICS.map(t => (
              <TouchableOpacity key={t} style={[styles.topicChip, topic === t && styles.topicChipActive]} onPress={() => setTopic(t === topic ? '' : t)}>
                <Text style={[styles.topicText, topic === t && styles.topicTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={creating}>
            {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.createBtnText}>Open Room</Text>}
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={rooms}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRooms(); }} tintColor={colors.therapy} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handleJoin(item)} activeOpacity={0.8}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardEmoji}>💙</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.topic && <Text style={styles.cardTopic}>{item.topic}</Text>}
              <Text style={styles.cardMeta}>👥 {item.participant_count} people · Anonymous</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>💙</Text>
            <Text style={styles.emptyTitle}>No rooms yet</Text>
            <Text style={styles.emptySubText}>Open the first safe space for someone who needs it.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  banner: { backgroundColor: colors.therapy + '15', marginHorizontal: 16, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.therapy + '30' },
  bannerText: { color: colors.therapy, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  createBox: { backgroundColor: colors.bgCard, marginHorizontal: 16, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border, gap: 10 },
  createInput: { backgroundColor: colors.bgInput, color: colors.textPrimary, borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  topicWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  topicChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  topicChipActive: { backgroundColor: colors.therapy + '20', borderColor: colors.therapy },
  topicText: { color: colors.textMuted, fontSize: 12 },
  topicTextActive: { color: colors.therapy, fontWeight: '600' },
  createBtn: { backgroundColor: colors.therapy, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  createBtnText: { color: '#fff', fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 12 },
  cardLeft: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.therapy + '20', justifyContent: 'center', alignItems: 'center' },
  cardEmoji: { fontSize: 22 },
  cardInfo: { flex: 1, gap: 3 },
  cardTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  cardTopic: { color: colors.therapy, fontSize: 12, fontWeight: '600' },
  cardMeta: { color: colors.textMuted, fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySubText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
