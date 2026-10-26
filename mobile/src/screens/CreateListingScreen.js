import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../theme/colors';
import { BASE_SERVER_URL } from '../api/client';
import api from '../api/client';

const CATS = ['fashion','electronics','food','furniture','services','transport','agriculture','other'];
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

  const showOptions = () => {
    if (images.length >= 4) { Alert.alert('Max 4 photos'); return; }
    Alert.alert('Add Photo', 'Choose', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Gallery', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4,3], quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) setImages(p => [...p, result.assets[0]]);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4,3], quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) setImages(p => [...p, result.assets[0]]);
  };

  const uploadImage = (asset, token) => new Promise((resolve, reject) => {
    const uri = asset.uri;
    const name = uri.split('/').pop() || 'photo.jpg';
    const ext = (name.split('.').pop() || 'jpg').toLowerCase();
    const body = new FormData();
    body.append('images', { uri, name, type: `image/${ext}` });
    const xhr = new XMLHttpRequest();
    xhr.open('POST', BASE_SERVER_URL + '/api/upload/listing');
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (data.success && data.urls?.[0]) resolve(data.urls[0]);
        else reject(new Error('Upload failed'));
      } catch { reject(new Error('Parse error')); }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(body);
  });

  const handleSubmit = async () => {
    if (!title) { Alert.alert('Required', 'Add a title'); return; }
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('wesoxch_token');
      const imageUrls = [];
      for (let i = 0; i < images.length; i++) {
        setUploadStep(`Uploading photo ${i+1}/${images.length}...`);
        imageUrls.push(await uploadImage(images[i], token));
      }
      setUploadStep('Saving...');
      await api.post('/listings', { title, description, category, price: parseFloat(price)||0, price_type: priceType, location_name: locationName, latitude: coords?.latitude||null, longitude: coords?.longitude||null, images: imageUrls });
      Alert.alert('Posted!', 'Your listing is live!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setLoading(false); setUploadStep(''); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Listing</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Photos (up to 4)</Text>
        <View style={styles.imgRow}>
          {images.map((img, i) => (
            <View key={i} style={styles.imgThumb}>
              <Image source={{ uri: img.uri }} style={styles.thumbImg} />
              <TouchableOpacity style={styles.removeImg} onPress={() => setImages(p => p.filter((_,idx) => idx !== i))}>
                <Ionicons name="close-circle" size={20} color={colors.rose} />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 4 && (
            <TouchableOpacity style={styles.addImgBtn} onPress={showOptions}>
              <Ionicons name="camera-outline" size={26} color={colors.textMuted} />
              <Text style={styles.addImgText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="What are you selling?" placeholderTextColor={colors.textMuted} />
        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.inputMulti]} value={description} onChangeText={setDescription} placeholder="Describe your item..." placeholderTextColor={colors.textMuted} multiline numberOfLines={4} />
        <Text style={styles.label}>Category</Text>
        <View style={styles.chips}>
          {CATS.map(c => (
            <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c.charAt(0).toUpperCase()+c.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Price Type</Text>
        <View style={styles.chips}>
          {PRICE_TYPES.map(p => (
            <TouchableOpacity key={p} style={[styles.chip, priceType === p && styles.chipActive]} onPress={() => setPriceType(p)}>
              <Text style={[styles.chipText, priceType === p && styles.chipTextActive]}>{p.charAt(0).toUpperCase()+p.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {priceType !== 'free' && (
          <>
            <Text style={styles.label}>Price (KES)</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
          </>
        )}
        <Text style={styles.label}>Location</Text>
        <TextInput style={styles.input} value={locationName} onChangeText={setLocationName} placeholder="e.g. Kisumu CBD" placeholderTextColor={colors.textMuted} />
        {coords && <Text style={styles.gpsNote}>📍 GPS attached</Text>}
        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
          {loading
            ? <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.submitBtnText}>{uploadStep || 'Posting...'}</Text>
              </View>
            : <Text style={styles.submitBtnText}>Post Listing</Text>
          }
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
  imgRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  imgThumb: { width: 78, height: 78, borderRadius: 10, position: 'relative' },
  thumbImg: { width: 78, height: 78, borderRadius: 10 },
  removeImg: { position: 'absolute', top: -8, right: -8 },
  addImgBtn: { width: 78, height: 78, borderRadius: 10, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4 },
  addImgText: { color: colors.textMuted, fontSize: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 13 },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  gpsNote: { color: colors.green, fontSize: 11, marginTop: 6 },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
