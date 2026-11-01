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

const MAX_PHOTOS = 4;
const CATEGORIES = ['fashion', 'electronics', 'food', 'furniture', 'services', 'transport', 'agriculture', 'other'];
const PRICE_TYPES = ['fixed', 'negotiable', 'free', 'hourly'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function CreateListingScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [price, setPrice] = useState('');
  const [priceType, setPriceType] = useState('fixed');
  const [locationName, setLocationName] = useState('');
  const [coords, setCoords] = useState(null);
  const [images, setImages] = useState([]);
  const [allowance, setAllowance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('');

  useEffect(() => {
    api.get('/listings/allowance').then(r => setAllowance(r.data)).catch(() => {});
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

  const freeLeft = allowance && !allowance.premium ? Math.max(allowance.remaining - images.length, 0) : null;
  const canAdd = images.length < MAX_PHOTOS;

  const addPhoto = async () => {
    if (!canAdd) return;
    if (freeLeft === 0) {
      Alert.alert(
        'No free photos left',
        `You have used your ${allowance.limit} free photos. Premium memberships are coming soon. You can also delete an older listing to free some up.`
      );
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('We need your permission', 'Allow access to your photos so you can pick a picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
      if (!result.canceled && result.assets?.[0]) {
        const small = await shrink(result.assets[0]);
        setImages(p => [...p, small]);
      }
    } catch {
      Alert.alert('Could not open your photos', 'Please try again.');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const urls = [];
      for (let i = 0; i < images.length; i++) {
        setStep(`Uploading photo ${i + 1} of ${images.length}`);
        const res = await uploadPhoto('/api/upload/listing', 'images', images[i]);
        if (!res.success || !res.urls?.[0]) throw new Error(res.message || 'A photo did not upload');
        urls.push(res.urls[0]);
      }
      setStep('Publishing');
      await api.post('/listings', {
        title: title.trim(),
        description: description.trim(),
        category,
        price: parseFloat(price) || 0,
        price_type: priceType,
        location_name: locationName,
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null,
        images: urls,
      });
      Alert.alert('Your listing is live', 'People can see it now.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      const data = e.response?.data;
      if (data?.code === 'IMAGE_LIMIT') {
        setAllowance(a => ({ ...a, ...data }));
        Alert.alert('No free photos left', data.message);
      } else {
        Alert.alert('Sorry, that did not work', data?.message || e.message || 'Check your connection and try again.');
      }
    } finally {
      setLoading(false);
      setStep('');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New listing</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Photos</Text>
        {allowance && (
          <Text style={styles.allowance}>
            {allowance.premium
              ? 'Premium: add as many photos as you need.'
              : `You have ${freeLeft} of ${allowance.limit} free photos left.`}
          </Text>
        )}
        <View style={styles.photoGrid}>
          {images.map((img, i) => (
            <View key={img.uri} style={styles.photoTile}>
              <Image source={{ uri: img.uri }} style={styles.photo} contentFit="cover" />
              <TouchableOpacity
                style={styles.removePhoto}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={() => setImages(p => p.filter((_, idx) => idx !== i))}
                accessibilityLabel="Remove photo"
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {canAdd && (
            <TouchableOpacity style={[styles.photoTile, styles.addTile]} onPress={addPhoto} accessibilityLabel="Add a photo">
              <Ionicons name="image-outline" size={28} color={colors.muted} />
              <Text style={styles.addText}>Add photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="What are you selling?" placeholderTextColor={colors.muted} maxLength={100} />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={description}
          onChangeText={setDescription}
          placeholder="Size, condition, anything a buyer should know"
          placeholderTextColor={colors.muted}
          multiline
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chips}>
          {CATEGORIES.map(c => (
            <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{cap(c)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Price type</Text>
        <View style={styles.chips}>
          {PRICE_TYPES.map(p => (
            <TouchableOpacity key={p} style={[styles.chip, priceType === p && styles.chipActive]} onPress={() => setPriceType(p)}>
              <Text style={[styles.chipText, priceType === p && styles.chipTextActive]}>{cap(p)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {priceType !== 'free' && (
          <>
            <Text style={styles.label}>Price (KES)</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="0" placeholderTextColor={colors.muted} keyboardType="numeric" />
          </>
        )}

        <Text style={styles.label}>Where is it?</Text>
        <TextInput style={styles.input} value={locationName} onChangeText={setLocationName} placeholder="e.g. Kisumu CBD" placeholderTextColor={colors.muted} />

        <TouchableOpacity
          style={[styles.submit, (!title.trim() || loading) && styles.submitOff]}
          onPress={handleSubmit}
          disabled={!title.trim() || loading}
        >
          {loading ? (
            <View style={styles.submitRow}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.submitText}>{step || 'Working'}</Text>
            </View>
          ) : (
            <Text style={styles.submitText}>Publish</Text>
          )}
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
  label: { fontSize: 14, fontWeight: '500', color: colors.text, marginTop: 24, marginBottom: 8 },
  allowance: { fontSize: 14, color: colors.muted, marginBottom: 12 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoTile: { width: '48.5%', aspectRatio: 4 / 3, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface },
  photo: { width: '100%', height: '100%' },
  removePhoto: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(17,20,23,0.7)', justifyContent: 'center', alignItems: 'center' },
  addTile: { justifyContent: 'center', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed' },
  addText: { fontSize: 14, color: colors.muted },
  input: { backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, minHeight: 44, fontSize: 16, color: colors.text },
  inputMulti: { minHeight: 100, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, minHeight: 40, justifyContent: 'center', borderRadius: 999, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 14, color: colors.text },
  chipTextActive: { color: '#fff', fontWeight: '500' },
  submit: { backgroundColor: colors.primary, borderRadius: 8, minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 32 },
  submitOff: { opacity: 0.45 },
  submitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
