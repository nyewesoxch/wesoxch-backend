import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api from '../api/client';

const COCOA = '#7B4F2E';
const EVENT_TYPES = ['social','sports','music','business','education','food','arts','other'];

export default function CreateEventScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('social');
  const [locationName, setLocationName] = useState('');
  const [startsAt, setStartsAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('');
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(loc => {
          setCoords(loc.coords);
          Location.reverseGeocodeAsync(loc.coords).then(geo => {
            if (geo[0]) setLocationName([geo[0].city, geo[0].region, geo[0].country].filter(Boolean).join(', '));
          });
        });
      }
    });
  }, []);

  const handleSubmit = async () => {
    if (!title) { Alert.alert('Required', 'Event title is required'); return; }
    setLoading(true);
    try {
      await api.post('/events', { title, description, event_type: eventType, location_name: locationName, starts_at: startsAt.toISOString(), is_free: isFree, price: isFree ? 0 : parseFloat(price) || 0, latitude: coords?.latitude || null, longitude: coords?.longitude || null });
      Alert.alert('Event Created! 🎉', 'Your event is now live.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) { Alert.alert('Error', err.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Create Event</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.label}>Event Title *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="What's the event?" placeholderTextColor="#64748B" />
        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.inputMulti]} value={description} onChangeText={setDescription} placeholder="Tell people what to expect..." placeholderTextColor="#64748B" multiline numberOfLines={4} />
        <Text style={styles.label}>Event Type</Text>
        <View style={styles.chipRow}>
          {EVENT_TYPES.map(t => (
            <TouchableOpacity key={t} style={[styles.chip, eventType === t && styles.chipActive]} onPress={() => setEventType(t)}>
              <Text style={[styles.chipText, eventType === t && styles.chipTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Location</Text>
        <TextInput style={styles.input} value={locationName} onChangeText={setLocationName} placeholder="e.g. Kisumu Sports Ground" placeholderTextColor="#64748B" />
        {coords && <Text style={styles.gpsTag}>📍 GPS attached automatically</Text>}
        <Text style={styles.label}>Start Date & Time *</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={18} color="#94A3B8" />
          <Text style={styles.dateBtnText}>{startsAt.toLocaleDateString('en-KE', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker value={startsAt} mode="date" display="default" minimumDate={new Date()}
            onChange={(event, date) => { setShowDatePicker(false); if (date) { setStartsAt(date); setShowTimePicker(true); } }} />
        )}
        {showTimePicker && (
          <DateTimePicker value={startsAt} mode="time" display="default"
            onChange={(event, date) => { setShowTimePicker(false); if (date) setStartsAt(date); }} />
        )}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Free Event</Text>
          <Switch value={isFree} onValueChange={setIsFree} trackColor={{ false: '#334155', true: COCOA }} thumbColor={isFree ? '#fff' : '#94A3B8'} />
        </View>
        {!isFree && (
          <>
            <Text style={styles.label}>Ticket Price (KES)</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="0" placeholderTextColor="#64748B" keyboardType="numeric" />
          </>
        )}
        <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Event</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  scroll: { padding: 16, paddingBottom: 40 },
  label: { color: '#94A3B8', fontSize: 12, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#1E293B', color: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, borderWidth: 1, borderColor: '#334155' },
  inputMulti: { height: 100, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  chipText: { color: '#94A3B8', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  gpsTag: { color: '#22C55E', fontSize: 11, marginTop: 6 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#334155' },
  dateBtnText: { color: '#fff', fontSize: 14, flex: 1 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#334155' },
  switchLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  submitBtn: { backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitBtnDisabled: { backgroundColor: '#166534' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
