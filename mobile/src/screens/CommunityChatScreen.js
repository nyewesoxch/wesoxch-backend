import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const COCOA = '#7B4F2E';

export default function CommunityChatScreen({ route, navigation }) {
  const { community } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
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
    } catch (err) { console.error('Chat error:', err.message); }
    finally { setLoading(false); }
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    const msgText = text.trim();
    setText('');
    try {
      await api.post(`/chat/${community.id}`, { message: msgText });
      await fetchMessages();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) { setText(msgText); }
    finally { setSending(false); }
  };

  const formatTime = (dateStr) => new Date(dateStr).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

  const renderMessage = ({ item, index }) => {
    const isMe = item.user_id === user?.id;
    const prevMsg = messages[index - 1];
    const showAvatar = !isMe && (!prevMsg || prevMsg.user_id !== item.user_id);
    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && (
          <TouchableOpacity style={styles.msgAvatarCol} onPress={() => navigation.navigate('UserProfile', { userId: item.user_id, username: item.username })}>
            {showAvatar ? (
              item.avatar_url
                ? <Image source={{ uri: item.avatar_url }} style={styles.msgAvatar} />
                : <View style={styles.msgAvatar}><Text style={styles.msgAvatarText}>{(item.username || '?').charAt(0).toUpperCase()}</Text></View>
            ) : <View style={{ width: 32 }} />}
          </TouchableOpacity>
        )}
        <View style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleThem]}>
          {!isMe && showAvatar && (
            <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.user_id, username: item.username })}>
              <Text style={styles.msgUsername}>{item.full_name || item.username}</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.msgText}>{item.message}</Text>
          <Text style={styles.msgTime}>{formatTime(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COCOA} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <TouchableOpacity style={styles.headerInfo} onPress={() => navigation.navigate('CommunityMembers', { community })}>
          {community.avatar_url
            ? <Image source={{ uri: community.avatar_url }} style={styles.headerAvatar} />
            : <View style={styles.headerAvatarPlaceholder}><Text style={styles.headerAvatarText}>{community.name.charAt(0).toUpperCase()}</Text></View>}
          <View>
            <Text style={styles.headerTitle}>{community.name}</Text>
            <Text style={styles.headerSub}>👥 {community.member_count} members · tap to view</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('CommunityMembers', { community })}>
          <Ionicons name="people-outline" size={24} color={COCOA} />
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList ref={flatListRef} data={messages} keyExtractor={(item) => item.id} renderItem={renderMessage}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No messages yet</Text><Text style={styles.emptySubText}>Be the first to say something! 👋</Text></View>}
        />
        <View style={styles.inputRow}>
          <TextInput style={styles.textInput} value={text} onChangeText={setText} placeholder="Type a message..." placeholderTextColor="#64748B" multiline maxLength={500} />
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
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 8 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: COCOA, justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  msgList: { padding: 16, paddingBottom: 8, gap: 4 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
  msgRowMe: { justifyContent: 'flex-end' },
  msgAvatarCol: { marginRight: 8 },
  msgAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COCOA, justifyContent: 'center', alignItems: 'center' },
  msgAvatarText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  msgBubble: { maxWidth: '75%', borderRadius: 16, padding: 10, paddingHorizontal: 14 },
  msgBubbleMe: { backgroundColor: COCOA, borderBottomRightRadius: 4 },
  msgBubbleThem: { backgroundColor: '#1E293B', borderBottomLeftRadius: 4 },
  msgUsername: { fontSize: 11, color: '#A0522D', fontWeight: '600', marginBottom: 4 },
  msgText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  msgTime: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, textAlign: 'right' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  emptySubText: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#1E293B', backgroundColor: '#0F172A' },
  textInput: { flex: 1, backgroundColor: '#1E293B', color: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: '#334155' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COCOA, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#334155' },
});
