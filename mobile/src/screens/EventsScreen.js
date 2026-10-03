import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, SafeAreaView, Alert, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const COCOA = '#7B4F2E';

export default function EventsScreen({ navigation }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchEvents('all'); }, []);

  const fetchEvents = async (currentFilter) => {
    try {
      let url = '/events?limit=50';
      if (currentFilter === 'free') url += '&is_free=true';
      const res = await api.get(url);
      setEvents(res.data.events || []);
    } catch (err) { console.error('Events error:', err.message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleAttend = async (event) => {
    try {
      await api.post(`/events/${event.id}/attend`, { status: 'going' });
      Alert.alert('RSVP confirmed! 🎉', `You are going to ${event.title}`);
      fetchEvents(filter);
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Could not RSVP'); }
  };

  const handleDelete = (event) => {
    Alert.alert('Delete Event', `Delete "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/events/${event.id}`); setEvents(prev => prev.filter(e => e.id !== event.id)); }
        catch (err) { Alert.alert('Error', 'Could not delete.'); }
      }}
    ]);
  };

  const renderEvent = ({ item }) => {
    const isOwner = item.created_by === user?.id;
    return (
      <View style={styles.card}>
        {item.cover_url ? <Image source={{ uri: item.cover_url }} style={styles.coverImage} /> : null}
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateDay}>{new Date(item.starts_at).getDate()}</Text>
              <Text style={styles.dateMonth}>{new Date(item.starts_at).toLocaleString('en-KE', { month: 'short' }).toUpperCase()}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.cardMeta}>📍 {item.location_name || 'TBA'}</Text>
            </View>
          </View>
          <View style={styles.cardFooter}>
            <View style={[styles.tag, { backgroundColor: item.is_free ? '#166534' : '#7C2D12' }]}>
              <Text style={styles.tagText}>{item.is_free ? '🟢 FREE' : `💰 KES ${item.price}`}</Text>
            </View>
            <Text style={styles.cardMeta}>👥 {item.attendee_count} going</Text>
            {isOwner ? (
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.attendBtn} onPress={() => handleAttend(item)}>
                <Text style={styles.attendBtnText}>RSVP</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#22C55E" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📅 Events</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateEvent')}>
          <Text style={styles.createBtnText}>+ Create</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.filters}>
        {['all', 'free'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => { setFilter(f); setLoading(true); fetchEvents(f); }}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f === 'all' ? 'All Events' : '🟢 Free Only'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList data={events} keyExtractor={(item) => item.id} renderItem={renderEvent} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEvents(filter); }} tintColor="#22C55E" />}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No events yet</Text><Text style={styles.emptySubText}>Create the first one!</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  createBtn: { backgroundColor: '#22C55E', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  filters: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  filterBtnActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  filterText: { color: '#94A3B8', fontSize: 13 },
  filterTextActive: { color: '#fff', fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { backgroundColor: '#1E293B', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' },
  coverImage: { width: '100%', height: 180, resizeMode: 'cover' },
  cardBody: { padding: 16 },
  cardHeader: { flexDirection: 'row', marginBottom: 12 },
  dateBadge: { width: 48, height: 56, backgroundColor: COCOA, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  dateDay: { color: '#fff', fontSize: 20, fontWeight: 'bold', lineHeight: 24 },
  dateMonth: { color: '#F5DEB3', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  cardMeta: { fontSize: 12, color: '#94A3B8', marginBottom: 2 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  tag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  attendBtn: { backgroundColor: '#22C55E', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  attendBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  deleteBtn: { backgroundColor: '#7F1D1D', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  deleteBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  emptySubText: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
});
