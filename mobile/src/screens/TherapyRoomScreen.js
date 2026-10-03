import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';

export default function TherapyRoomScreen({ route, navigation }) {
  const { room } = route.params;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const flatListRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  const fetchMessages = async () => {
    try { const res = await api.get(`/therapy/rooms/${room.id}/messages`); setMessages(res.data.messages || []); }
    catch (err) { console.error('Therapy messages error:', err.message); }
    finally { setLoading(false); }
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    const msgText = text.trim();
    setText('');
    try {
      await api.post(`/therapy/rooms/${room.id}/messages`, { message: msgText, is_anonymous: isAnonymous });
      await fetchMessages();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) { setText(msgText); }
    finally { setSending(false); }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#8B5CF6" /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{room.title}</Text>
          {room.topic && <Text style={styles.headerSub}>{room.topic}</Text>}
        </View>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.safetyBanner}>
        <Text style={styles.safetyText}>💙 Safe, anonymous space. Be kind and supportive.</Text>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList ref={flatListRef} data={messages} keyExtractor={(item) => item.id}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <View style={styles.msgContainer}>
              <View style={styles.msgHeader}>
                <View style={styles.anonAvatar}><Text style={styles.anonAvatarText}>💙</Text></View>
                <Text style={styles.msgName}>{item.is_anonymous ? (item.anonymous_name || 'Anonymous') : 'You'}</Text>
                <Text style={styles.msgTime}>{new Date(item.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <View style={styles.msgBubble}><Text style={styles.msgText}>{item.message}</Text></View>
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No messages yet</Text><Text style={styles.emptySubText}>Be the first to share. You are safe here. 💙</Text></View>}
        />
        <View style={styles.anonRow}>
          <Text style={styles.anonLabel}>Send anonymously</Text>
          <Switch value={isAnonymous} onValueChange={setIsAnonymous} trackColor={{ false: '#334155', true: '#8B5CF6' }} thumbColor={isAnonymous ? '#fff' : '#94A3B8'} />
        </View>
        <View style={styles.inputRow}>
          <TextInput style={styles.textInput} value={text} onChangeText={setText} placeholder="Share what's on your mind..." placeholderTextColor="#64748B" multiline maxLength={500} />
          <TouchableOpacity style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]} onPress={handleSend} disabled={!text.trim() || sending}>
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  flex: { flex: 1 },
  centered: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerInfo: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 11, color: '#8B5CF6', marginTop: 2 },
  safetyBanner: { backgroundColor: '#1E1B4B', paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#4338CA' },
  safetyText: { color: '#A5B4FC', fontSize: 12, textAlign: 'center' },
  msgList: { padding: 16, paddingBottom: 8, gap: 12 },
  msgContainer: { marginBottom: 4 },
  msgHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  anonAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1E1B4B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#4338CA' },
  anonAvatarText: { fontSize: 14 },
  msgName: { color: '#8B5CF6', fontSize: 12, fontWeight: '600', flex: 1 },
  msgTime: { color: '#64748B', fontSize: 10 },
  msgBubble: { backgroundColor: '#1E293B', borderRadius: 12, borderTopLeftRadius: 4, padding: 12, marginLeft: 36 },
  msgText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  anonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#1E293B' },
  anonLabel: { color: '#94A3B8', fontSize: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#1E293B', backgroundColor: '#0F172A' },
  textInput: { flex: 1, backgroundColor: '#1E293B', color: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: '#334155' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#334155' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  emptySubText: { color: '#94A3B8', fontSize: 13, marginTop: 4, textAlign: 'center' },
});
