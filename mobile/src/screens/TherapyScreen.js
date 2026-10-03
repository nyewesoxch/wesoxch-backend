import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';

const TOPICS = ['Anxiety','Depression','Grief','Relationships','Work Stress','Self-esteem','Loneliness','Family','Other'];

export default function TherapyScreen({ navigation }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchRooms(); }, []);

  const fetchRooms = async () => {
    try { const res = await api.get('/therapy/rooms'); setRooms(res.data.rooms || []); }
    catch (err) { console.error('Therapy rooms error:', err.message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleJoinRoom = async (room) => {
    try { await api.post(`/therapy/rooms/${room.id}/join`); } catch (err) {}
    navigation.navigate('TherapyRoom', { room });
  };

  const handleCreateRoom = async () => {
    if (!newTitle) { Alert.alert('Required', 'Please add a title'); return; }
    setCreating(true);
    try {
      const res = await api.post('/therapy/rooms', { title: newTitle, topic: newTopic, is_anonymous: true });
      Alert.alert('Room Created!', 'Your support room is now open.');
      setNewTitle(''); setNewTopic(''); setShowCreate(false);
      fetchRooms();
      navigation.navigate('TherapyRoom', { room: res.data.room });
    } catch (err) { Alert.alert('Error', 'Could not create room.'); }
    finally { setCreating(false); }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#8B5CF6" /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>💙 Our Therapy</Text>
        <TouchableOpacity onPress={() => setShowCreate(!showCreate)} style={styles.createBtn}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.intro}>
        <Text style={styles.introText}>A safe space to share, listen and support each other anonymously. You are not alone. 💙</Text>
      </View>
      {showCreate && (
        <View style={styles.createBox}>
          <Text style={styles.createLabel}>Room Title</Text>
          <TextInput style={styles.createInput} value={newTitle} onChangeText={setNewTitle} placeholder="e.g. Dealing with anxiety" placeholderTextColor="#64748B" />
          <Text style={styles.createLabel}>Topic (optional)</Text>
          <View style={styles.topicRow}>
            {TOPICS.map(t => (
              <TouchableOpacity key={t} style={[styles.topicChip, newTopic === t && styles.topicChipActive]} onPress={() => setNewTopic(t === newTopic ? '' : t)}>
                <Text style={[styles.topicChipText, newTopic === t && styles.topicChipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.createSubmitBtn} onPress={handleCreateRoom} disabled={creating}>
            {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.createSubmitBtnText}>Open Support Room</Text>}
          </TouchableOpacity>
        </View>
      )}
      <FlatList data={rooms} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRooms(); }} tintColor="#8B5CF6" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handleJoinRoom(item)} activeOpacity={0.8}>
            <View style={styles.cardTop}>
              <View style={styles.iconCircle}><Text style={styles.iconText}>💙</Text></View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.topic && <Text style={styles.cardTopic}>{item.topic}</Text>}
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.participantCount}>👥 {item.participant_count}</Text>
                <View style={styles.anonBadge}><Text style={styles.anonBadgeText}>Anonymous</Text></View>
              </View>
            </View>
            <Text style={styles.cardHint}>Tap to join and share anonymously</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💙</Text>
            <Text style={styles.emptyText}>No support rooms yet</Text>
            <Text style={styles.emptySubText}>Be the first to open a safe space.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  createBtn: { backgroundColor: '#8B5CF6', borderRadius: 10, padding: 8 },
  intro: { backgroundColor: '#1E1B4B', marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#4338CA' },
  introText: { color: '#A5B4FC', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  createBox: { backgroundColor: '#1E293B', marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  createLabel: { color: '#94A3B8', fontSize: 12, marginBottom: 8, marginTop: 8 },
  createInput: { backgroundColor: '#0F172A', color: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, borderWidth: 1, borderColor: '#334155' },
  topicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  topicChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155' },
  topicChipActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  topicChipText: { color: '#94A3B8', fontSize: 12 },
  topicChipTextActive: { color: '#fff', fontWeight: '600' },
  createSubmitBtn: { backgroundColor: '#8B5CF6', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  createSubmitBtnText: { color: '#fff', fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1E1B4B', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#4338CA' },
  iconText: { fontSize: 22 },
  cardInfo: { flex: 1 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardTopic: { color: '#8B5CF6', fontSize: 12, fontWeight: '600' },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  participantCount: { color: '#64748B', fontSize: 12 },
  anonBadge: { backgroundColor: '#1E1B4B', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#4338CA' },
  anonBadgeText: { color: '#A5B4FC', fontSize: 10, fontWeight: '600' },
  cardHint: { color: '#64748B', fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  emptySubText: { color: '#94A3B8', fontSize: 13, marginTop: 4, textAlign: 'center' },
});
