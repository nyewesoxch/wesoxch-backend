import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import api from '../api/client';

const TYPES = ['geographic','interest','activity'];

export default function CreateCommunityScreen({ navigation }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('geographic');
  const [locationName, setLocationName] = useState('');
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
    if (!name) { Alert.alert('Required', 'Name is required'); return; }
    setLoading(true);
    try {
      await api.post('/communities', { name, description, type, location_name: locationName, latitude: coords?.latitude || null, longitude: coords?.longitude || null });
      Alert.alert('Created!', `${name} is now live!`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Could not create.'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Community</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Kisumu Entrepreneurs" placeholderTextColor={colors.textMuted} />
        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.inputMulti]} value={description} onChangeText={setDescription} placeholder="What is this community about?" placeholderTextColor={colors.textMuted} multiline numberOfLines={4} />
        <Text style={styles.label}>Type</Text>
        <View style={styles.chips}>
          {TYPES.map(t => (
            <TouchableOpacity key={t} style={[styles.chip, type === t && styles.chipActive]} onPress={() => setType(t)}>
              <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t === 'geographic' ? '📍 Geographic' : t === 'interest' ? '💡 Interest' : '⚡ Activity'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Location</Text>
        <TextInput style={styles.input} value={locationName} onChangeText={setLocationName} placeholder="e.g. Kisumu, Kenya" placeholderTextColor={colors.textMuted} />
        {coords && <Text style={styles.gpsNote}>📍 GPS coordinates attached</Text>}
        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Community</Text>}
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
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 13 },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  gpsNote: { color: colors.green, fontSize: 11, marginTop: 6 },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
