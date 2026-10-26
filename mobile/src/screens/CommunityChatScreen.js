import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import api from '../api/client';

export default function CommunityChatScreen({ route, navigation }) {
  const { community } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/chat/${community.id}`);
      setMessages(res.data.messages || []);
    } catch {}
    finally { setLoading(false); }
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    const msg = text.trim();
    setText('');
    try {
      await api.post(`/chat/${community.id}`, { message: msg });
      await fetchMessages();
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch { setText(msg); }
    finally { setSending(false); }
  };

  const formatTime = (d) => new Date(d).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

  const renderMsg = ({ item, index }) => {
    const isMe = item.user_id === user?.id;
    const prev = messages[index - 1];
    const showName = !isMe && (!prev || prev.user_id !== item.user_id);
    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && (
          <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.user_id })}>
            {showName ? (
              item.avatar_url
                ? <Image source={{ uri: item.avatar_url }} style={styles.msgAvatar} />
                : <View style={styles.msgAvatar}><Text style={styles.msgAvatarText}>{(item.username||'?').charAt(0).toUpperCase()}</Text></View>
            ) : <View style={{ width: 32 }} />}
          </TouchableOpacity>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          {!isMe && showName && (
            <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.user_id })}>
              <Text style={styles.msgName}>{item.full_name || item.username}</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.msgText}>{item.message}</Text>
          <Text style={styles.msgTime}>{formatTime(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerInfo} onPress={() => navigation.navigate('CommunityMembers', { community })}>
          {community.avatar_url
            ? <Image source={{ uri: community.avatar_url }} style={styles.headerAvatar} />
            : <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}><Text style={{ color: '#fff', fontWeight: '700' }}>{community.name.charAt(0)}</Text></View>
          }
          <View>
            <Text style={styles.headerName}>{community.name}</Text>
            <Text style={styles.headerSub}>{community.member_count} members · tap to view</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('CommunityMembers', { community })}>
          <Ionicons name="people-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMsg}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubText}>Be the first to say something</Text>
            </View>
          }
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type something..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={18} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerAvatarPlaceholder: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  headerName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  headerSub: { fontSize: 11, color: colors.textMuted },
  msgList: { padding: 12, gap: 4, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 2 },
  msgRowMe: { justifyContent: 'flex-end' },
  msgAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  msgAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bubble: { maxWidth: '76%', borderRadius: 18, padding: 10, paddingHorizontal: 14 },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: colors.bgElevated, borderBottomLeftRadius: 4 },
  msgName: { fontSize: 11, color: colors.primaryLight, fontWeight: '700', marginBottom: 3 },
  msgText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  msgTime: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3, textAlign: 'right' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  emptySubText: { color: colors.textMuted, fontSize: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, backgroundColor: colors.bgElevated, color: colors.textPrimary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: colors.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: colors.bgElevated },
});
