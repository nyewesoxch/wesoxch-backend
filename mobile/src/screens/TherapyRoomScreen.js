import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import api from '../api/client';

export default function TherapyRoomScreen({ route, navigation }) {
  const { room } = route.params;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [isAnon, setIsAnon] = useState(true);
  const flatRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  const fetchMessages = async () => {
    try { const res = await api.get(`/therapy/rooms/${room.id}/messages`); setMessages(res.data.messages || []); }
    catch {}
    finally { setLoading(false); }
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    const msg = text.trim();
    setText('');
    try {
      await api.post(`/therapy/rooms/${room.id}/messages`, { message: msg, is_anonymous: isAnon });
      await fetchMessages();
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch { setText(msg); }
    finally { setSending(false); }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.therapy} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{room.title}</Text>
          {room.topic && <Text style={styles.headerTopic}>{room.topic}</Text>}
        </View>
        <View style={{ width: 22 }} />
      </View>
      <View style={styles.safetyBanner}>
        <Text style={styles.safetyText}>💙 Be kind. Be safe. You are not alone.</Text>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <View style={styles.msgWrap}>
              <View style={styles.msgHeader}>
                <Text style={styles.msgName}>{item.is_anonymous ? (item.anonymous_name || 'Anonymous') : 'You'}</Text>
                <Text style={styles.msgTime}>{new Date(item.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <View style={styles.bubble}>
                <Text style={styles.msgText}>{item.message}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 36 }}>💙</Text>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubText}>You are safe here. Share what's on your mind.</Text>
            </View>
          }
        />
        <View style={styles.anonRow}>
          <Text style={styles.anonLabel}>Send as anonymous</Text>
          <Switch value={isAnon} onValueChange={setIsAnon} trackColor={{ false: colors.border, true: colors.therapy }} thumbColor={isAnon ? '#fff' : colors.textMuted} />
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Share what's on your mind..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
  headerInfo: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  headerTopic: { fontSize: 11, color: colors.therapy, marginTop: 2 },
  safetyBanner: { backgroundColor: colors.therapy + '15', paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.therapy + '20' },
  safetyText: { color: colors.therapy, fontSize: 12, textAlign: 'center' },
  msgList: { padding: 14, gap: 12, paddingBottom: 8 },
  msgWrap: { gap: 4 },
  msgHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  msgName: { color: colors.therapy, fontSize: 12, fontWeight: '700' },
  msgTime: { color: colors.textMuted, fontSize: 10 },
  bubble: { backgroundColor: colors.bgElevated, borderRadius: 14, borderTopLeftRadius: 4, padding: 12, alignSelf: 'flex-start', maxWidth: '85%' },
  msgText: { color: colors.textPrimary, fontSize: 14, lineHeight: 20 },
  anonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  anonLabel: { color: colors.textSecondary, fontSize: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8, backgroundColor: colors.bg },
  input: { flex: 1, backgroundColor: colors.bgElevated, color: colors.textPrimary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: colors.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.therapy, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: colors.bgElevated },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  emptySubText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
});
