import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { BASE_SERVER_URL } from '../api/client';
import api from '../api/client';
import * as SecureStore from 'expo-secure-store';

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
    return local.charAt(0) + '***' + local.charAt(local.length - 1) + '@' + domain;
  };

  const formatDate = (d) => {
    try { return new Date(d).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' }); }
    catch { return 'Unknown'; }
  };

  const showAvatarOptions = () => Alert.alert('Profile Picture', 'Choose', [
    { text: 'Camera', onPress: takePhoto },
    { text: 'Gallery', onPress: pickImage },
    { text: 'Cancel', style: 'cancel' },
  ]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1,1], quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) await uploadAvatar(result.assets[0]);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1,1], quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) await uploadAvatar(result.assets[0]);
  };

  const uploadAvatar = async (asset) => {
    setUploadingAvatar(true);
    try {
      const token = await SecureStore.getItemAsync('wesoxch_token');
      const uri = asset.uri;
      const name = uri.split('/').pop() || 'avatar.jpg';
      const ext = (name.split('.').pop() || 'jpg').toLowerCase();
      const result = await new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('avatar', { uri, name, type: `image/${ext}` });
        const xhr = new XMLHttpRequest();
        xhr.open('POST', BASE_SERVER_URL + '/api/upload/avatar');
        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.onload = () => { try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new Error('Parse error')); } };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });
      if (result.success) { setUser(result.user); Alert.alert('Done!', 'Profile picture updated.'); }
      else Alert.alert('Error', 'Upload failed.');
    } catch (err) { Alert.alert('Error', err.message || 'Could not upload.'); }
    finally { setUploadingAvatar(false); }
  };

  const handleSave = async () => {
    if (!fullName.trim()) { Alert.alert('Required', 'Name cannot be empty'); return; }
    setSaving(true);
    try {
      const res = await api.patch('/users/profile', { full_name: fullName.trim(), bio: bio.trim(), phone: phone.trim() });
      setUser({ ...user, ...res.data.user });
      setEditing(false);
      Alert.alert('Saved!', 'Profile updated.');
    } catch { Alert.alert('Error', 'Could not save.'); }
    finally { setSaving(false); }
  };

  const handleLogout = () => Alert.alert('Log out', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Log out', style: 'destructive', onPress: logout },
  ]);

  const quickActions = [
    { icon: 'calendar', color: colors.green, label: 'Event', screen: 'CreateEvent' },
    { icon: 'people', color: colors.purple, label: 'Community', screen: 'CreateCommunity' },
    { icon: 'home', color: colors.amber, label: 'Rentals', screen: 'Rentals' },
    { icon: 'heart', color: colors.therapy, label: 'Therapy', screen: 'Therapy' },
    { icon: 'cube', color: colors.carrier, label: 'Carrier', screen: 'Carrier' },
    user?.is_seller
      ? { icon: 'storefront', color: colors.market, label: 'Listings', screen: 'MyListings' }
      : { icon: 'storefront-outline', color: colors.cocoa, label: 'Sell', screen: 'BecomeSeller' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[colors.primaryDark + '60', colors.bg]} style={styles.headerGradient}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>👤 Profile</Text>
          </View>
          <TouchableOpacity style={styles.avatarWrap} onPress={showAvatarOptions}>
            {uploadingAvatar
              ? <View style={styles.avatar}><ActivityIndicator color="#fff" size="large" /></View>
              : user?.avatar_url
                ? <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
                : <View style={styles.avatar}><Text style={styles.avatarText}>{(user?.full_name || user?.username || '?').charAt(0).toUpperCase()}</Text></View>
            }
            <View style={styles.cameraBadge}><Ionicons name="camera" size={14} color="#fff" /></View>
          </TouchableOpacity>
          <Text style={styles.userName}>{user?.full_name || user?.username}</Text>
          <Text style={styles.userHandle}>@{user?.username}</Text>
          <Text style={styles.userEmail}>{maskEmail(user?.email)}</Text>
          <View style={styles.badges}>
            {user?.is_verified && <View style={styles.badge}><Text style={styles.badgeText}>✅ Verified</Text></View>}
            {user?.is_seller && <View style={[styles.badge, { borderColor: colors.market }]}><Text style={[styles.badgeText, { color: colors.market }]}>🛍️ Seller</Text></View>}
          </View>
        </LinearGradient>

        <View style={styles.quickActions}>
          {quickActions.map((a, i) => (
            <TouchableOpacity key={i} style={styles.quickBtn} onPress={() => navigation.navigate(a.screen)}>
              <View style={[styles.quickIcon, { backgroundColor: a.color + '20' }]}>
                <Ionicons name={a.icon} size={20} color={a.color} />
              </View>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Info</Text>
            {!editing && (
              <TouchableOpacity onPress={() => { setFullName(user?.full_name||''); setBio(user?.bio||''); setPhone(user?.phone||''); setEditing(true); }}>
                <Text style={styles.editBtn}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          {editing ? (
            <View style={styles.editForm}>
              {[
                { label: 'Full Name', value: fullName, setter: setFullName },
                { label: 'Bio', value: bio, setter: setBio, multiline: true },
                { label: 'Phone', value: phone, setter: setPhone, keyboardType: 'phone-pad' },
              ].map((f, i) => (
                <View key={i}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={[styles.input, f.multiline && styles.inputMulti]}
                    value={f.value}
                    onChangeText={f.setter}
                    placeholderTextColor={colors.textMuted}
                    multiline={f.multiline}
                    numberOfLines={f.multiline ? 3 : 1}
                    keyboardType={f.keyboardType || 'default'}
                  />
                </View>
              ))}
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              {[
                { label: 'Name', value: user?.full_name || '—' },
                { label: 'Bio', value: user?.bio || '—' },
                { label: 'Phone', value: user?.phone || '—' },
                { label: 'Age', value: user?.age ? `${user.age} years` : '—' },
                { label: 'Member since', value: formatDate(user?.created_at) },
              ].map((f, i) => (
                <View key={i} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{f.label}</Text>
                  <Text style={styles.infoValue}>{f.value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.legalBtn} onPress={() => navigation.navigate('Legal')}>
          <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.legalBtnText}>Terms & Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 40 },
  headerGradient: { paddingTop: 16, paddingBottom: 24, alignItems: 'center', paddingHorizontal: 16 },
  header: { width: '100%', marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarImg: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: colors.primary },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '800' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.primary, borderRadius: 14, padding: 5, borderWidth: 2, borderColor: colors.bg },
  userName: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 2 },
  userHandle: { fontSize: 14, color: colors.textSecondary },
  userEmail: { fontSize: 13, color: colors.textMuted, marginTop: 2, marginBottom: 10 },
  badges: { flexDirection: 'row', gap: 8 },
  badge: { borderWidth: 1, borderColor: colors.green, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: colors.green, fontSize: 12, fontWeight: '600' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  quickBtn: { width: '30%', flex: 1, backgroundColor: colors.bgCard, borderRadius: 14, padding: 12, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border },
  quickIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  section: { backgroundColor: colors.bgCard, borderRadius: 20, margin: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  editBtn: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  editForm: { gap: 12 },
  fieldLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 6 },
  input: { backgroundColor: colors.bgInput, color: colors.textPrimary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: colors.bgElevated, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.bg },
  infoLabel: { color: colors.textMuted, fontSize: 13 },
  infoValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },
  legalBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bgCard, borderRadius: 14, marginHorizontal: 16, marginBottom: 10, padding: 16, borderWidth: 1, borderColor: colors.border },
  legalBtnText: { flex: 1, color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.rose, borderRadius: 14, marginHorizontal: 16, paddingVertical: 16 },
  logoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
