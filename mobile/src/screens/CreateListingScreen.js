import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { BASE_SERVER_URL } from '../api/client';
import api from '../api/client';

const COCOA = '#7B4F2E';
const CATEGORIES = ['fashion','electronics','food','furniture','services','transport','agriculture','other'];
const PRICE_TYPES = ['fixed','negotiable','free','hourly'];

export default function CreateListingScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [price, setPrice] = useState('');
  const [priceType, setPriceType] = useState('fixed');
  const [locationName, setLocationName] = useState('');
  const [coords, setCoords] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadStep, setUploadStep] = useState('');

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null).then(loc => {
          setCoords(loc.coords);
          Location.reverseGeocodeAsync(loc.coords).then(geo => {
            if (geo[0]) setLocationName([geo[0].city, geo[0].region, geo[0].country].filter(Boolean).join(', '));
          });
        });
      }
    });
  }, []);

  const showImageOptions = () => {
    if (images.length >= 4) { Alert.alert('Max 4 photos'); return; }
    Alert.alert('Add Photo', 'Choose', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Gallery', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaType.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setImages(prev => [...prev, result.assets[0]]);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setImages(prev => [...prev, result.assets[0]]);
  };

  const uploadImage = async (imageAsset, token) => {
    const formData = new FormData();
    formData.append('images', { uri: imageAsset.uri, type: 'image/jpeg', name: `listing_${Date.now()}.jpg` });
    const response = await fetch(`${BASE_SERVER_URL}/api/upload/listing`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
    const data = await response.json();
    if (data.success && data.urls && data.urls.length > 0) return data.urls[0];
    throw new Error('Upload failed');
  };

  const handleSubmit = async () => {
    if (!title) { Alert.alert('Required', 'Please add a title'); return; }
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('wesoxch_token');
      const imageUrls = [];
      for (let i = 0; i < images.length; i++) {
        setUploadStep(`Uploading photo ${i+1} of ${images.length}...`);
        const url = await uploadImage(images[i], token);
        imageUrls.push(url);
      }
      setUploadStep('Saving listing...');
      await api.post('/listings', { title, description, category, price: parseFloat(price) || 0, price_type: priceType, location_name: locationName, latitude: coords?.latitude || null, longitude: coords?.longitude || null, images: imageUrls });
      Alert.alert('Posted! 🎉', 'Your listing is now live!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) { Alert.alert('Error', `Could not post listing: ${err.message}`); }
    finally { setLoading(false); setUploadStep(''); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>New Listing</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.label}>Photos (up to 4)</Text>
        <View style={styles.imageRow}>
          {images.map((img, i) => (
            <View key={i} style={styles.imageThumb}>
              <Image source={{ uri: img.uri }} style={styles.thumbImg} />
              <TouchableOpacity style={styles.removeImg} onPress={() => setImages(prev => prev.filter((_, idx) => idx !== i))}>
                <Ionicons name="close-circle" size={22} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 4 && (
            <TouchableOpacity style={styles.addImageBtn} onPress={showImageOptions}>
              <Ionicons name="camera-outline" size={28} color="#64748B" />
              <Text style={styles.addImageText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="What are you selling?" placeholderTextColor="#64748B" />
        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.inputMulti]} value={description} onChangeText={setDescription} placeholder="Describe your item..." placeholderTextColor="#64748B" multiline numberOfLines={4} />
        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map(c => (
            <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c.charAt(0).toUpperCase() + c.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Price Type</Text>
        <View style={styles.chipRow}>
          {PRICE_TYPES.map(p => (
            <TouchableOpacity key={p} style={[styles.chip, priceType === p && styles.chipActive]} onPress={() => setPriceType(p)}>
              <Text style={[styles.chipText, priceType === p && styles.chipTextActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {priceType !== 'free' && (
          <>
            <Text style={styles.label}>Price (KES)</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="0" placeholderTextColor="#64748B" keyboardType="numeric" />
          </>
        )}
        <Text style={styles.label}>Location</Text>
        <TextInput style={styles.input} value={locationName} onChangeText={setLocationName} placeholder="e.g. Kisumu CBD" placeholderTextColor="#64748B" />
        {coords && <Text style={styles.gpsTag}>📍 GPS attached automatically</Text>}
        <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><ActivityIndicator color="#fff" size="small" /><Text style={styles.submitBtnText}>{uploadStep || 'Posting...'}</Text></View>
            : <Text style={styles.submitBtnText}>Post Listing</Text>}
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
  imageRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  imageThumb: { width: 80, height: 80, borderRadius: 10, position: 'relative' },
  thumbImg: { width: 80, height: 80, borderRadius: 10 },
  removeImg: { position: 'absolute', top: -8, right: -8 },
  addImageBtn: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4 },
  addImageText: { color: '#64748B', fontSize: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: COCOA, borderColor: COCOA },
  chipText: { color: '#94A3B8', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  gpsTag: { color: '#22C55E', fontSize: 11, marginTop: 6 },
  submitBtn: { backgroundColor: COCOA, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitBtnDisabled: { backgroundColor: '#5C3A1E' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
