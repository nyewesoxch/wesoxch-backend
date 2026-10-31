import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { shrink } from '../utils/images';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../theme/colors';
import { BASE_SERVER_URL } from '../api/client';
import api from '../api/client';

const PROP_TYPES = ['bedsitter','single_room','one_bedroom','two_bedroom','three_bedroom','studio','commercial'];
const AMENITIES = ['Water','Electricity','WiFi','Parking','Security','DSTV','Gym','Furnished'];

export default function CreateRentalScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propType, setPropType] = useState('single_room');
  const [rent, setRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [bedrooms, setBedrooms] = useState('1');
  const [bathrooms, setBathrooms] = useState('1');
  const [amenities, setAmenities] = useState([]);
  const [locationName, setLocationName] = useState('');
  const [areaName, setAreaName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
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
          if (geo[0]) { setLocationName([geo[0].city, geo[0].region, geo[0].country].filter(Boolean).join(', ')); setAreaName(geo[0].city || ''); }
        }
      } catch {}
    })();
  }, []);

  const toggleAmenity = a => setAmenities(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);

  const showOptions = () => {
    if (images.length >= 6) { Alert.alert('Max 6'); return; }
    Alert.alert('Add Photo', '', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Gallery', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4,3], quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) { const small = await shrink(result.assets[0]); setImages(p => [...p, small]); }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4,3], quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) { const small = await shrink(result.assets[0]); setImages(p => [...p, small]); }
  };

  const uploadImage = (asset, token) => new Promise((resolve, reject) => {
    const uri = asset.uri;
    const name = uri.split('/').pop() || 'photo.jpg';
    const ext = (name.split('.').pop() || 'jpg').toLowerCase();
    const body = new FormData();
    body.append('images', { uri, name, type: `image/${ext}` });
    const xhr = new XMLHttpRequest();
    xhr.open('POST', BASE_SERVER_URL + '/api/upload/rental');
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
    if (!title || !rent) { Alert.alert('Required', 'Title and rent amount needed'); return; }
    if (!phone && !whatsapp) { Alert.alert('Required', 'Add a contact number'); return; }
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('wesoxch_token');
      const imageUrls = [];
      for (let i = 0; i < images.length; i++) {
        setUploadStep(`Uploading photo ${i+1}/${images.length}...`);
        imageUrls.push(await uploadImage(images[i], token));
      }
      setUploadStep('Saving...');
      await api.post('/rentals', { title, description, property_type: propType, rent_amount: parseFloat(rent), deposit_amount: parseFloat(deposit)||0, bedrooms: parseInt(bedrooms)||1, bathrooms: parseInt(bathrooms)||1, amenities, location_name: locationName, area_name: areaName, landlord_phone: phone, landlord_whatsapp: whatsapp, latitude: coords?.latitude||null, longitude: coords?.longitude||null, images: imageUrls });
      Alert.alert('Listed!', 'Your rental is live.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setLoading(false); setUploadStep(''); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>List a Rental</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Photos (up to 6)</Text>
        <View style={styles.imgRow}>
          {images.map((img, i) => (
            <View key={i} style={styles.imgThumb}>
              <Image source={{ uri: img.uri }} style={styles.thumbImg} />
              <TouchableOpacity style={styles.removeImg} onPress={() => setImages(p => p.filter((_,idx) => idx !== i))}>
                <Ionicons name="close-circle" size={20} color={colors.rose} />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 6 && (
            <TouchableOpacity style={styles.addImgBtn} onPress={showOptions}>
              <Ionicons name="camera-outline" size={26} color={colors.textMuted} />
              <Text style={styles.addImgText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Spacious bedsitter in Milimani" placeholderTextColor={colors.textMuted} />
        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.inputMulti]} value={description} onChangeText={setDescription} placeholder="Describe the place..." placeholderTextColor={colors.textMuted} multiline numberOfLines={4} />
        <Text style={styles.label}>Property Type</Text>
        <View style={styles.chips}>
          {PROP_TYPES.map(t => (
            <TouchableOpacity key={t} style={[styles.chip, propType === t && styles.chipActive]} onPress={() => setPropType(t)}>
              <Text style={[styles.chipText, propType === t && styles.chipTextActive]}>{t.replace(/_/g,' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Rent (KES) *</Text>
            <TextInput style={styles.input} value={rent} onChangeText={setRent} placeholder="5000" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Deposit</Text>
            <TextInput style={styles.input} value={deposit} onChangeText={setDeposit} placeholder="5000" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
          </View>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Bedrooms</Text>
            <TextInput style={styles.input} value={bedrooms} onChangeText={setBedrooms} placeholder="1" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Bathrooms</Text>
            <TextInput style={styles.input} value={bathrooms} onChangeText={setBathrooms} placeholder="1" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
          </View>
        </View>
        <Text style={styles.label}>Amenities</Text>
        <View style={styles.chips}>
          {AMENITIES.map(a => (
            <TouchableOpacity key={a} style={[styles.chip, amenities.includes(a) && styles.chipActive]} onPress={() => toggleAmenity(a)}>
              <Text style={[styles.chipText, amenities.includes(a) && styles.chipTextActive]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Area / Neighbourhood *</Text>
        <TextInput style={styles.input} value={areaName} onChangeText={setAreaName} placeholder="e.g. Milimani, Kondele" placeholderTextColor={colors.textMuted} />
        <Text style={styles.label}>Full Location</Text>
        <TextInput style={styles.input} value={locationName} onChangeText={setLocationName} placeholder="e.g. Kisumu, Kenya" placeholderTextColor={colors.textMuted} />
        {coords && <Text style={styles.gpsNote}>📍 GPS attached</Text>}
        <Text style={styles.label}>Your Phone *</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+254..." placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
        <Text style={styles.label}>WhatsApp</Text>
        <TextInput style={styles.input} value={whatsapp} onChangeText={setWhatsapp} placeholder="+254..." placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
          {loading
            ? <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.submitBtnText}>{uploadStep || 'Posting...'}</Text>
              </View>
            : <Text style={styles.submitBtnText}>List Rental</Text>
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
  row: { flexDirection: 'row' },
  imgRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  imgThumb: { width: 78, height: 78, borderRadius: 10, position: 'relative' },
  thumbImg: { width: 78, height: 78, borderRadius: 10 },
  removeImg: { position: 'absolute', top: -8, right: -8 },
  addImgBtn: { width: 78, height: 78, borderRadius: 10, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4 },
  addImgText: { color: colors.textMuted, fontSize: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.amber + '20', borderColor: colors.amber },
  chipText: { color: colors.textMuted, fontSize: 13 },
  chipTextActive: { color: colors.amber, fontWeight: '600' },
  gpsNote: { color: colors.green, fontSize: 11, marginTop: 6 },
  submitBtn: { backgroundColor: colors.amber, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
