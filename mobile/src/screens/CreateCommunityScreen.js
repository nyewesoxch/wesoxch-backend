import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { shrink } from '../utils/images';
import { uploadPhoto } from '../utils/upload';
import api from '../api/client';

const TYPES = [
  { key: 'geographic', label: 'Place' },
  { key: 'interest', label: 'Interest' },
  { key: 'activity', label: 'Activity' },
];

export default function CreateCommunityScreen({ navigation }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('geographic');
  const [locationName, setLocationName] = useState('');
  const [coords, setCoords] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({});
        setCoords(loc.coords);
        const geo = await Location.reverseGeocodeAsync(loc.coords);
        if (geo[0]) setLocationName([geo[0].city, geo[0].region, geo[0].country].filter(Boolean).join(', '));
      } catch {}
    })();
  }, []);

  const choosePhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('We need your permission', 'Allow access to your photos so you can pick a picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (!result.canceled && result.assets?.[0]) setPhoto(await shrink(result.assets[0], 512));
    } catch {
      Alert.alert('Could not open your photos', 'Please try again.');
    }
  };

  const create = async (avatarUrl) => {
    try {
      await api.post('/communities', {
        name: name.trim(),
        description: description.trim(),
        type,
        location_name: locationName,
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null,
        avatar_url: avatarUrl || null,
      });
      Alert.alert('Community created', `${name.trim()} is ready for its first members.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Sorry, we could not create it', e.response?.data?.message || 'Check your connection and try again.');
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    let avatarUrl = null;
    if (photo) {
      try {
        const res = await uploadPhoto('/api/upload/community-avatar', 'avatar', photo);
        if (!res.success || !res.url) throw new Error(res.message || 'Upload failed');
        avatarUrl = res.url;
      } catch {
        setLoading(false);
        Alert.alert('The photo did not upload', 'Do you want to create the community without it?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Create without photo', onPress: async () => { setLoading(true); await create(null); setLoading(false); } },
        ]);
        return;
      }
    }
    await create(avatarUrl);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New community</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.photoWrap}>
          <TouchableOpacity style={styles.photoCircle} onPress={choosePhoto} accessibilityLabel="Choose a community photo">
            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.photoImg} contentFit="cover" />
            ) : (
              <Ionicons name="camera-outline" size={32} color={colors.muted} />
            )}
          </TouchableOpacity>
          <Text style={styles.photoHint}>{photo ? 'Tap to change the photo' : 'Add a community photo (optional)'}</Text>
        </View>

        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Kisumu Entrepreneurs" placeholderTextColor={colors.muted} maxLength={100} />

        <Text style={styles.label}>What is it about?</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={description}
          onChangeText={setDescription}
          placeholder="Tell people what this community is for"
          placeholderTextColor={colors.muted}
          multiline
        />

        <Text style={styles.label}>Type</Text>
        <View style={styles.chips}>
          {TYPES.map(t => (
            <TouchableOpacity key={t.key} style={[styles.chip, type === t.key && styles.chipActive]} onPress={() => setType(t.key)}>
              <Text style={[styles.chipText, type === t.key && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Where is it?</Text>
        <TextInput style={styles.input} value={locationName} onChangeText={setLocationName} placeholder="e.g. Kisumu, Kenya" placeholderTextColor={colors.muted} />

        <TouchableOpacity
          style={[styles.submit, (!name.trim() || loading) && styles.submitOff]}
          onPress={handleSubmit}
          disabled={!name.trim() || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create community</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 4 },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
  scroll: { padding: 16, paddingBottom: 48 },
  photoWrap: { alignItems: 'center', marginTop: 8, gap: 8 },
  photoCircle: { width: 112, height: 112, borderRadius: 56, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1.5, borderColor: colors.border },
  photoImg: { width: '100%', height: '100%' },
  photoHint: { fontSize: 14, color: colors.muted },
  label: { fontSize: 14, fontWeight: '500', color: colors.text, marginTop: 24, marginBottom: 8 },
  input: { backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, minHeight: 44, fontSize: 16, color: colors.text },
  inputMulti: { minHeight: 100, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, minHeight: 40, justifyContent: 'center', borderRadius: 999, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 14, color: colors.text },
  chipTextActive: { color: '#fff', fontWeight: '500' },
  submit: { backgroundColor: colors.primary, borderRadius: 8, minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 32 },
  submitOff: { opacity: 0.45 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
