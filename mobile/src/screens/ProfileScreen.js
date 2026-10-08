import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { BASE_SERVER_URL } from '../api/client';
import api from '../api/client';
import * as SecureStore from 'expo-secure-store';

const COCOA = '#7B4F2E';

export default function ProfileScreen({ navigation }) {
  const { user, logout, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const maskEmail = (email) => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    return local.charAt(0) + '***' + (local.length > 1 ? local.charAt(local.length - 1) : '') + '@' + domain;
  };

  const formatMemberSince = (dateStr) => {
    if (!dateStr) return 'Unknown';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Unknown';
      return d.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
    } catch (e) { return 'Unknown'; }
  };

  const showAvatarOptions = () => Alert.alert('Profile Picture', 'Choose an option', [
    { text: 'Take Photo', onPress: handleTakePhoto },
    { text: 'Choose from Gallery', onPress: handlePickAvatar },
    { text: 'Cancel', style: 'cancel' },
  ]);

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadAvatar(result.assets[0]);
      }
    } catch (e) { Alert.alert('Error', 'Could not open gallery'); }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed'); return; }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadAvatar(result.assets[0]);
      }
    } catch (e) { Alert.alert('Error', 'Could not open camera'); }
  };

  const uploadAvatar = async (imageAsset) => {
    setUploadingAvatar(true);
    try {
      const token = await SecureStore.getItemAsync('wesoxch_token');
      const formData = new FormData();
      formData.append('avatar', { uri: imageAsset.uri, type: 'image/jpeg', name: 'avatar.jpg' });
      const response = await fetch(`${BASE_SERVER_URL}/api/upload/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (data.success) { setUser(data.user); Alert.alert('Done!', 'Profile picture updated.'); }
      else Alert.alert('Error', 'Could not upload image.');
    } catch (err) { Alert.alert('Error', 'Could not upload image.'); }
    finally { setUploadingAvatar(false); }
  };

  const handleSave = async () => {
    if (!fullName.trim()) { Alert.alert('Required', 'Full name cannot be empty'); return; }
    setSaving(true);
    try {
      const res = await api.patch('/users/profile', {
        full_name: fullName.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
      });
      setUser({ ...user, ...res.data.user });
      setEditing(false);
      Alert.alert('Saved!', 'Profile updated.');
    } catch (err) { Alert.alert('Error', 'Could not save profile.'); }
    finally { setSaving(false); }
  };

  const handleLogout = () => Alert.alert('Log out', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Log out', style: 'destructive', onPress: logout },
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}><Text style={styles.headerTitle}>👤 Profile</Text></View>

        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={showAvatarOptions}>
            {uploadingAvatar
              ? <View style={styles.avatar}><ActivityIndicator color="#fff" size="large" /></View>
              : user?.avatar_url
                ? <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
                : <View style={styles.avatar}><Text style={styles.avatarText}>{(user?.full_name || user?.username || '?').charAt(0).toUpperCase()}</Text></View>
            }
            <View style={styles.cameraIcon}><Ionicons name="camera" size={14} color="#fff" /></View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
          <Text style={styles.username}>@{user?.username}</Text>
          <Text style={styles.email}>{maskEmail(user?.email)}</Text>
          <View style={styles.badges}>
            {user?.is_verified && <Text style={styles.badge}>✅ Verified</Text>}
            {user?.is_seller && <Text style={[styles.badge, { color: COCOA }]}>🛍️ Seller</Text>}
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('CreateEvent')}>
            <Ionicons name="calendar" size={20} color="#22C55E" />
            <Text style={styles.quickBtnText}>Add Event</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('CreateCommunity')}>
            <Ionicons name="people" size={20} color="#3B82F6" />
            <Text style={styles.quickBtnText}>Community</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Rentals')}>
            <Ionicons name="home" size={20} color="#F59E0B" />
            <Text style={styles.quickBtnText}>Rentals</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Therapy')}>
            <Ionicons name="heart" size={20} color="#8B5CF6" />
            <Text style={styles.quickBtnText}>Therapy</Text>
          </TouchableOpacity>
          {user?.is_seller
            ? <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('MyListings')}>
                <Ionicons name="storefront" size={20} color={COCOA} />
                <Text style={styles.quickBtnText}>Listings</Text>
              </TouchableOpacity>
            : <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('BecomeSeller')}>
                <Ionicons name="storefront-outline" size={20} color={COCOA} />
                <Text style={styles.quickBtnText}>Sell Here</Text>
              </TouchableOpacity>
          }
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Info</Text>
            {!editing && (
              <TouchableOpacity onPress={() => {
                setFullName(user?.full_name || '');
                setBio(user?.bio || '');
                setPhone(user?.phone || '');
                setEditing(true);
              }}>
                <Text style={styles.editBtn}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          {editing ? (
            <>
              <Text style={styles.label}>Full Name</Text>
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Your full name" placeholderTextColor="#64748B" />
              <Text style={styles.label}>Bio</Text>
              <TextInput style={[styles.input, styles.inputMulti]} value={bio} onChangeText={setBio} placeholder="Tell your community about yourself..." placeholderTextColor="#64748B" multiline numberOfLines={3} />
              <Text style={styles.label}>Phone</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+254..." placeholderTextColor="#64748B" keyboardType="phone-pad" />
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Name</Text><Text style={styles.infoValue}>{user?.full_name || '—'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Bio</Text><Text style={styles.infoValue}>{user?.bio || '—'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Phone</Text><Text style={styles.infoValue}>{user?.phone || '—'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Age</Text><Text style={styles.infoValue}>{user?.age ? `${user.age} years` : '—'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Member since</Text><Text style={styles.infoValue}>{formatMemberSince(user?.created_at)}</Text></View>
            </>
          )}
        </View>

        <TouchableOpacity style={styles.legalBtn} onPress={() => navigation.navigate('Legal')}>
          <Text style={styles.legalBtnText}>📄 Terms & Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { paddingTop: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  avatarSection: { alignItems: 'center', marginBottom: 16 },
  avatarWrapper: { position: 'relative', marginBottom: 8 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: COCOA, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COCOA, borderRadius: 12, padding: 4, borderWidth: 2, borderColor: '#0F172A' },
  avatarHint: { color: '#64748B', fontSize: 11, marginBottom: 8 },
  username: { color: '#fff', fontSize: 18, fontWeight: '700' },
  email: { color: '#94A3B8', fontSize: 14, marginTop: 4 },
  badges: { flexDirection: 'row', gap: 12, marginTop: 6 },
  badge: { color: '#22C55E', fontSize: 12 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  quickBtn: { flex: 1, minWidth: '28%', backgroundColor: '#1E293B', borderRadius: 12, padding: 12, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#334155' },
  quickBtnText: { color: '#fff', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  section: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  editBtn: { color: COCOA, fontSize: 14, fontWeight: '600' },
  label: { color: '#94A3B8', fontSize: 12, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: '#0F172A', color: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 4 },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, backgroundColor: '#334155', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: '#94A3B8', fontWeight: '600' },
  saveBtn: { flex: 2, backgroundColor: COCOA, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#0F172A' },
  infoLabel: { color: '#64748B', fontSize: 13 },
  infoValue: { color: '#fff', fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },
  legalBtn: { backgroundColor: '#1E293B', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  legalBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  logoutBtn: { backgroundColor: '#EF4444', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  logoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
