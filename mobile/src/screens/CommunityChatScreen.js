import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Image } from 'expo-image';
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
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatRef = useRef(null);
  const removed = useRef(new Set()); // messages this person reported, kept hidden even if a refresh returns them

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/chat/${community.id}`);
      setMessages((res.data.messages || []).filter(m => !removed.current.has(m.id)));
      setError('');
    } catch {
      setError('We could not load messages. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const timer = setInterval(fetchMessages, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSend = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setText('');
    try {
      await api.post(`/chat/${community.id}`, { message: body });
      await fetchMessages();
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setText(body);
      Alert.alert('Message not sent', e.response?.data?.message || 'Check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  const sendReport = async (item, reason) => {
    removed.current.add(item.id);
    setMessages(m => m.filter(x => x.id !== item.id));
    try {
      await api.post(`/moderation/messages/${item.id}/report`, { reason });
      Alert.alert('Reported', 'The message is now hidden.');
    } catch (e) {
      removed.current.delete(item.id);
      fetchMessages();
      Alert.alert('Sorry, the report did not go through', e.response?.data?.message || 'Check your connection and try again.');
    }
  };

  const chooseReason = (item) =>
    Alert.alert('Why are you reporting this?', undefined, [
      { text: 'Spam or scam', onPress: () => sendReport(item, 'spam') },
      { text: 'Harassment or hate', onPress: () => sendReport(item, 'harassment') },
      { text: 'Something else', onPress: () => sendReport(item, 'other') },
    ], { cancelable: true });

  const doBlock = async (item) => {
    try {
      await api.post(`/moderation/blocks/${item.user_id}`);
      setMessages(m => m.filter(x => x.user_id !== item.user_id));
    } catch (e) {
      Alert.alert('Sorry, we could not block them', e.response?.data?.message || 'Check your connection and try again.');
    }
  };

  const confirmBlock = (item) =>
    Alert.alert(`Block @${item.username}?`, 'You will no longer see their messages in any community.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: () => doBlock(item) },
    ]);

  const openMenu = (item) =>
    Alert.alert(item.full_name || item.username, 'What would you like to do?', [
      { text: 'Report message', onPress: () => chooseReason(item) },
      { text: `Block @${item.username}`, style: 'destructive', onPress: () => confirmBlock(item) },
      { text: 'Cancel', style: 'cancel' },
    ], { cancelable: true });

  const time = (d) => new Date(d).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

  const renderMsg = ({ item, index }) => {
    const isMe = item.user_id === user?.id;
    const prev = messages[index - 1];
    const showName = !isMe && (!prev || prev.user_id !== item.user_id);
    return (
      <View style={[styles.row, isMe && styles.rowMe]}>
        {!isMe && (
          showName ? (
            <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.user_id })} accessibilityLabel={`View ${item.username}`}>
              {item.avatar_url
                ? <Image source={{ uri: item.avatar_url }} style={styles.avatar} contentFit="cover" />
                : <View style={[styles.avatar, styles.avatarLetter]}><Text style={styles.avatarText}>{(item.username || '?').charAt(0).toUpperCase()}</Text></View>}
            </TouchableOpacity>
          ) : <View style={styles.avatar} />
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          {showName && <Text style={styles.name} numberOfLines={1}>{item.full_name || item.username}</Text>}
          <Text style={[styles.msg, isMe && styles.msgMe]}>{item.message}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.time, isMe && styles.timeMe]}>{time(item.created_at)}</Text>
            {!isMe && (
              <TouchableOpacity
                onPress={() => openMenu(item)}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                accessibilityLabel="Report this message or block the sender"
              >
                <Ionicons name="ellipsis-horizontal" size={16} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerInfo} onPress={() => navigation.navigate('CommunityMembers', { community })}>
          {community.avatar_url
            ? <Image source={{ uri: community.avatar_url }} style={styles.headerAvatar} contentFit="cover" />
            : <View style={[styles.headerAvatar, styles.avatarLetter]}><Text style={styles.avatarText}>{community.name.charAt(0).toUpperCase()}</Text></View>}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>{community.name}</Text>
            <Text style={styles.headerSub}>{community.member_count} members</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('CommunityMembers', { community })} accessibilityLabel="See members">
          <Ionicons name="people-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {!!error && messages.length > 0 && (
        <View style={styles.banner}><Text style={styles.bannerText}>{error}</Text></View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMsg}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={32} color={colors.muted} />
              <Text style={styles.emptyTitle}>{error ? 'Sorry, that did not work' : 'No messages yet'}</Text>
              <Text style={styles.emptyText}>{error || 'Say hello and start the conversation.'}</Text>
              {!!error && (
                <TouchableOpacity style={styles.retryBtn} onPress={fetchMessages}>
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Write a message"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnOff]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
            accessibilityLabel="Send message"
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerName: { fontSize: 16, fontWeight: '600', color: colors.text },
  headerSub: { fontSize: 12, color: colors.muted },
  banner: { backgroundColor: colors.surface, paddingVertical: 8, paddingHorizontal: 16 },
  bannerText: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  list: { padding: 12, gap: 4, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  rowMe: { justifyContent: 'flex-end' },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarLetter: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  bubble: { maxWidth: '78%', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  name: { fontSize: 12, fontWeight: '600', color: colors.primary, marginBottom: 4 },
  msg: { fontSize: 14, lineHeight: 20, color: colors.text },
  msgMe: { color: '#fff' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  time: { fontSize: 12, color: colors.muted },
  timeMe: { color: 'rgba(255,255,255,0.75)' },
  empty: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  retryBtn: { marginTop: 8, backgroundColor: colors.primary, borderRadius: 8, minHeight: 44, paddingHorizontal: 24, justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 8, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text, maxHeight: 100, minHeight: 44 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnOff: { backgroundColor: colors.border },
});
