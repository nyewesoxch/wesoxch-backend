import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import api from '../api/client';

const TYPES = ['social','sports','music','business','education','food','arts','other'];

export default function CreateEventScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('social');
  const [locationName, setLocationName] = useState('');
  const [startsAt, setStartsAt] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('');
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setCoords(loc.coords);
          const geo = await Location.reverseGeocodeAsync(loc.coords);
          if (geo[0]) setLocationName([geo[0].city, geo[0].region, geo[0].country].filter(Boolean).join(', '));
        }
      } catch {}
    })();
  }, []);

  const handleSubmit = async () => {
    if (!title) { Alert.alert('Required', 'Add a title'); return; }
    setLoading(true);
    try {
      await api.post('/events', { title, description, event_type: eventType, location_name: locationName, starts_at: startsAt.toISOString(), is_free: isFree, price: isFree ? 0 : parseFloat(price) || 0, latitude: coords?.latitude || null, longitude: coords?.longitude || null });
      Alert.alert('Event Created!', 'Your event is live.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) { Alert.alert('Error', err.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Event</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="What's the event?" placeholderTextColor={colors.textMuted} />
        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.inputMulti]} value={description} onChangeText={setDescription} placeholder="Tell people what to expect..." placeholderTextColor={colors.textMuted} multiline numberOfLines={4} />
        <Text style={styles.label}>Type</Text>
        <View style={styles.chips}>
          {TYPES.map(t => (
            <TouchableOpacity key={t} style={[styles.chip, eventType === t && styles.chipActive]} onPress={() => setEventType(t)}>
              <Text style={[styles.chipText, eventType === t && styles.chipTextActive]}>{t.charAt(0).toUpperCase()+t.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Location</Text>
        <TextInput style={styles.input} value={locationName} onChangeText={setLocationName} placeholder="Where is it?" placeholderTextColor={colors.textMuted} />
        {coords && <Text style={styles.gpsNote}>📍 GPS coordinates attached</Text>}
        <Text style={styles.label}>Date & Time</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDate(true)}>
          <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
          <Text style={styles.dateBtnText}>{startsAt.toLocaleDateString('en-KE', { weekday:'short', year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</Text>
        </TouchableOpacity>
        {showDate && <DateTimePicker value={startsAt} mode="date" minimumDate={new Date()} onChange={(e, d) => { setShowDate(false); if (d) { setStartsAt(d); setShowTime(true); } }} />}
        {showTime && <DateTimePicker value={startsAt} mode="time" onChange={(e, d) => { setShowTime(false); if (d) setStartsAt(d); }} />}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Free Event</Text>
          <Switch value={isFree} onValueChange={setIsFree} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
        </View>
        {!isFree && (
          <>
            <Text style={styles.label}>Ticket Price (KES)</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
          </>
        )}
        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Event</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  scroll: { padding: 16, paddingBottom: 40 },
  label: { color: colors.textMuted, fontSize: 12, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: colors.bgElevated, color: colors.textPrimary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  inputMulti: { height: 100, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 13 },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  gpsNote: { color: colors.green, fontSize: 11, marginTop: 6 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bgElevated, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  dateBtnText: { color: colors.textPrimary, fontSize: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgElevated, borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: colors.border },
  switchLabel: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
