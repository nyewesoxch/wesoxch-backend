import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import api from '../api/client';

export default function EventsScreen({ navigation }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchEvents('all'); }, []);

  const fetchEvents = async (f) => {
    try {
      const res = await api.get(`/events?limit=50${f === 'free' ? '&is_free=true' : ''}`);
      setEvents(res.data.events || []);
    } catch (err) { console.error(err.message); }
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
        try { await api.delete(`/events/${event.id}`); setEvents(p => p.filter(e => e.id !== event.id)); }
        catch { Alert.alert('Error', 'Could not delete.'); }
      }}
    ]);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📅 Events</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateEvent')}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.filters}>
        {['all', 'free'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => { setFilter(f); setLoading(true); fetchEvents(f); }}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f === 'all' ? 'All Events' : '🟢 Free Only'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={events}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEvents(filter); }} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const isOwner = item.created_by === user?.id;
          return (
            <View style={styles.card}>
              {item.cover_url
                ? <Image source={{ uri: item.cover_url }} style={styles.cover} />
                : <LinearGradient colors={['#7C3AED', '#4C1D95']} style={styles.coverGradient}>
                    <Text style={{ fontSize: 40 }}>📅</Text>
                  </LinearGradient>
              }
              <View style={styles.cardBody}>
                <View style={styles.dateRow}>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateDay}>{new Date(item.starts_at).getDate()}</Text>
                    <Text style={styles.dateMonth}>{new Date(item.starts_at).toLocaleString('en', { month: 'short' }).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.cardMeta}>📍 {item.location_name || 'TBA'}</Text>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <View style={[styles.pill, { backgroundColor: item.is_free ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }]}>
                    <Text style={[styles.pillText, { color: item.is_free ? colors.green : colors.amber }]}>{item.is_free ? 'FREE' : `KES ${item.price}`}</Text>
                  </View>
                  <Text style={styles.metaSmall}>👥 {item.attendee_count}</Text>
                  {isOwner
                    ? <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                        <Text style={styles.deleteBtnText}>Delete</Text>
                      </TouchableOpacity>
                    : <TouchableOpacity style={styles.rsvpBtn} onPress={() => handleAttend(item)}>
                        <Text style={styles.rsvpBtnText}>RSVP</Text>
                      </TouchableOpacity>
                  }
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📅</Text>
            <Text style={styles.emptyTitle}>No events yet</Text>
            <TouchableOpacity style={styles.createFirstBtn} onPress={() => navigation.navigate('CreateEvent')}>
              <Text style={styles.createFirstBtnText}>Create the first event</Text>
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
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  card: { backgroundColor: colors.bgCard, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  cover: { width: '100%', height: 160 },
  coverGradient: { width: '100%', height: 100, justifyContent: 'center', alignItems: 'center' },
  cardBody: { padding: 14, gap: 10 },
  dateRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  dateBadge: { width: 50, height: 58, backgroundColor: colors.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  dateDay: { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 26 },
  dateMonth: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  cardMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: '700' },
  metaSmall: { flex: 1, fontSize: 12, color: colors.textMuted },
  rsvpBtn: { backgroundColor: colors.green, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  rsvpBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  deleteBtn: { backgroundColor: colors.rose, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  deleteBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { color: colors.textSecondary, fontSize: 16, marginBottom: 16 },
  createFirstBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  createFirstBtnText: { color: '#fff', fontWeight: '700' },
});
