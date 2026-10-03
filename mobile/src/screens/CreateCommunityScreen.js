import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api from '../api/client';

const COCOA = '#7B4F2E';
const TYPES = ['geographic', 'interest', 'activity'];

export default function CreateCommunityScreen({ navigation }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('geographic');
  const [locationName, setLocationName] = useState('');
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
    if (!name) { Alert.alert('Required', 'Community name is required'); return; }
    setLoading(true);
    try {
      await api.post('/communities', { name, description, type, location_name: locationName, latitude: coords?.latitude || null, longitude: coords?.longitude || null });
      Alert.alert('Created!', `${name} is now live!`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Could not create community.'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>New Community</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.label}>Community Name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Kisumu Entrepreneurs" placeholderTextColor="#64748B" />
        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.inputMulti]} value={description} onChangeText={setDescription} placeholder="What is this community about?" placeholderTextColor="#64748B" multiline numberOfLines={4} />
        <Text style={styles.label}>Community Type</Text>
        <View style={styles.chipRow}>
          {TYPES.map(t => (
            <TouchableOpacity key={t} style={[styles.chip, type === t && styles.chipActive]} onPress={() => setType(t)}>
              <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t === 'geographic' ? '📍 Geographic' : t === 'interest' ? '💡 Interest' : '⚡ Activity'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Location</Text>
        <TextInput style={styles.input} value={locationName} onChangeText={setLocationName} placeholder="e.g. Kisumu, Kenya" placeholderTextColor="#64748B" />
        {coords && <Text style={styles.gpsTag}>📍 GPS attached automatically</Text>}
        <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Community</Text>}
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
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: COCOA, borderColor: COCOA },
  chipText: { color: '#94A3B8', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  gpsTag: { color: '#22C55E', fontSize: 11, marginTop: 6 },
  submitBtn: { backgroundColor: COCOA, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitBtnDisabled: { backgroundColor: '#5C3A1E' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
