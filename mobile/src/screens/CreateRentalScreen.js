import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { BASE_SERVER_URL } from '../api/client';
import api from '../api/client';

const PROPERTY_TYPES = ['bedsitter','single_room','one_bedroom','two_bedroom','three_bedroom','studio','commercial','land'];
const AMENITIES_LIST = ['Water','Electricity','WiFi','Parking','Security','DSTV','Gym','Furnished'];

export default function CreateRentalScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyType, setPropertyType] = useState('single_room');
  const [rentAmount, setRentAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [bedrooms, setBedrooms] = useState('1');
  const [bathrooms, setBathrooms] = useState('1');
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [locationName, setLocationName] = useState('');
  const [areaName, setAreaName] = useState('');
  const [landlordPhone, setLandlordPhone] = useState('');
  const [landlordWhatsapp, setLandlordWhatsapp] = useState('');
  const [coords, setCoords] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadStep, setUploadStep] = useState('');

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(loc => {
          setCoords(loc.coords);
          Location.reverseGeocodeAsync(loc.coords).then(geo => {
            if (geo[0]) {
              setLocationName([geo[0].city, geo[0].region, geo[0].country].filter(Boolean).join(', '));
              setAreaName(geo[0].city || geo[0].district || '');
            }
          });
        });
      }
    });
  }, []);

  const toggleAmenity = (a) => setSelectedAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const showImageOptions = () => {
    if (images.length >= 6) { Alert.alert('Max 6 photos'); return; }
    Alert.alert('Add Photo', 'Choose', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Gallery', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7 });
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
    formData.append('images', { uri: imageAsset.uri, type: 'image/jpeg', name: `rental_${Date.now()}.jpg` });
    const response = await fetch(`${BASE_SERVER_URL}/api/upload/rental`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
    const data = await response.json();
    if (data.success && data.urls && data.urls.length > 0) return data.urls[0];
    throw new Error('Upload failed');
  };

  const handleSubmit = async () => {
    if (!title || !rentAmount) { Alert.alert('Required', 'Title and rent amount are required'); return; }
    if (!landlordPhone && !landlordWhatsapp) { Alert.alert('Required', 'Please add a contact number'); return; }
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
      await api.post('/rentals', { title, description, property_type: propertyType, rent_amount: parseFloat(rentAmount), deposit_amount: parseFloat(depositAmount) || 0, bedrooms: parseInt(bedrooms) || 1, bathrooms: parseInt(bathrooms) || 1, amenities: selectedAmenities, location_name: locationName, area_name: areaName, landlord_phone: landlordPhone, landlord_whatsapp: landlordWhatsapp, latitude: coords?.latitude || null, longitude: coords?.longitude || null, images: imageUrls });
      Alert.alert('Listed! 🎉', 'Your rental is now live.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) { Alert.alert('Error', `Could not post rental: ${err.message}`); }
    finally { setLoading(false); setUploadStep(''); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>List a Rental</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.label}>Photos (up to 6)</Text>
        <View style={styles.imageRow}>
          {images.map((img, i) => (
            <View key={i} style={styles.imageThumb}>
              <Image source={{ uri: img.uri }} style={styles.thumbImg} />
              <TouchableOpacity style={styles.removeImg} onPress={() => setImages(prev => prev.filter((_, idx) => idx !== i))}>
                <Ionicons name="close-circle" size={22} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 6 && (
            <TouchableOpacity style={styles.addImageBtn} onPress={showImageOptions}>
              <Ionicons name="camera-outline" size={28} color="#64748B" />
              <Text style={styles.addImageText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Spacious bedsitter in Milimani" placeholderTextColor="#64748B" />
        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.inputMulti]} value={description} onChangeText={setDescription} placeholder="Describe the property..." placeholderTextColor="#64748B" multiline numberOfLines={4} />
        <Text style={styles.label}>Property Type</Text>
        <View style={styles.chipRow}>
          {PROPERTY_TYPES.map(pt => (
            <TouchableOpacity key={pt} style={[styles.chip, propertyType === pt && styles.chipActive]} onPress={() => setPropertyType(pt)}>
              <Text style={[styles.chipText, propertyType === pt && styles.chipTextActive]}>{pt.replace(/_/g, ' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Rent (KES) *</Text>
            <TextInput style={styles.input} value={rentAmount} onChangeText={setRentAmount} placeholder="5000" placeholderTextColor="#64748B" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Deposit (KES)</Text>
            <TextInput style={styles.input} value={depositAmount} onChangeText={setDepositAmount} placeholder="5000" placeholderTextColor="#64748B" keyboardType="numeric" />
          </View>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Bedrooms</Text>
            <TextInput style={styles.input} value={bedrooms} onChangeText={setBedrooms} placeholder="1" placeholderTextColor="#64748B" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Bathrooms</Text>
            <TextInput style={styles.input} value={bathrooms} onChangeText={setBathrooms} placeholder="1" placeholderTextColor="#64748B" keyboardType="numeric" />
          </View>
        </View>
        <Text style={styles.label}>Amenities</Text>
        <View style={styles.chipRow}>
          {AMENITIES_LIST.map(a => (
            <TouchableOpacity key={a} style={[styles.chip, selectedAmenities.includes(a) && styles.chipActive]} onPress={() => toggleAmenity(a)}>
              <Text style={[styles.chipText, selectedAmenities.includes(a) && styles.chipTextActive]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Area / Neighbourhood *</Text>
        <TextInput style={styles.input} value={areaName} onChangeText={setAreaName} placeholder="e.g. Milimani, Kondele" placeholderTextColor="#64748B" />
        <Text style={styles.label}>Full Location</Text>
        <TextInput style={styles.input} value={locationName} onChangeText={setLocationName} placeholder="e.g. Kisumu, Kenya" placeholderTextColor="#64748B" />
        {coords && <Text style={styles.gpsTag}>📍 GPS attached automatically</Text>}
        <Text style={styles.label}>Your Phone Number *</Text>
        <TextInput style={styles.input} value={landlordPhone} onChangeText={setLandlordPhone} placeholder="+254..." placeholderTextColor="#64748B" keyboardType="phone-pad" />
        <Text style={styles.label}>WhatsApp Number</Text>
        <TextInput style={styles.input} value={landlordWhatsapp} onChangeText={setLandlordWhatsapp} placeholder="+254..." placeholderTextColor="#64748B" keyboardType="phone-pad" />
        <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><ActivityIndicator color="#fff" size="small" /><Text style={styles.submitBtnText}>{uploadStep || 'Posting...'}</Text></View>
            : <Text style={styles.submitBtnText}>List Rental</Text>}
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
  row: { flexDirection: 'row' },
  imageRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  imageThumb: { width: 80, height: 80, borderRadius: 10, position: 'relative' },
  thumbImg: { width: 80, height: 80, borderRadius: 10 },
  removeImg: { position: 'absolute', top: -8, right: -8 },
  addImageBtn: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4 },
  addImageText: { color: '#64748B', fontSize: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  chipText: { color: '#94A3B8', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  gpsTag: { color: '#22C55E', fontSize: 11, marginTop: 6 },
  submitBtn: { backgroundColor: '#F59E0B', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitBtnDisabled: { backgroundColor: '#92400E' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
