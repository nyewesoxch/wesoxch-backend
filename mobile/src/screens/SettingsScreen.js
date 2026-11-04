import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

// Shows only the last three digits, e.g. +254 7•• ••• 697
const maskPhone = (p) => {
  const s = String(p || '');
  const m = s.match(/^\+254(\d)(\d{2})(\d{3})(\d{3})$/);
  if (m) return `+254 ${m[1]}•• ••• ${m[4]}`;
  return s ? `••••${s.slice(-3)}` : 'Not set';
};

function Row({ icon, label, value, onPress, danger }) {
  const body = (
    <>
      <Ionicons name={icon} size={22} color={danger ? colors.danger : colors.muted} />
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
        {!!value && <Text style={styles.rowValue}>{value}</Text>}
      </View>
      {!!onPress && <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
    >
      {body}
    </TouchableOpacity>
  );
}

const Divider = () => <View style={styles.divider} />;

export default function SettingsScreen({ navigation }) {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.me}>
          <Avatar uri={user?.avatar_url} name={user?.full_name || user?.username} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={styles.meName} numberOfLines={1}>{user?.full_name || user?.username}</Text>
            <Text style={styles.meHandle} numberOfLines={1}>@{user?.username}</Text>
          </View>
        </View>

        <Text style={styles.groupTitle}>Account</Text>
        <View style={styles.group}>
          <Row icon="phone-portrait-outline" label="Phone number" value={maskPhone(user?.phone_number)} />
        </View>

        <Text style={styles.groupTitle}>Safety</Text>
        <View style={styles.group}>
          <Row icon="ban-outline" label="Blocked people" onPress={() => navigation.navigate('BlockedPeople')} />
        </View>

        <Text style={styles.groupTitle}>About Wesoxch</Text>
        <View style={styles.group}>
          <Row icon="document-text-outline" label="Terms and Privacy Policy" onPress={() => navigation.navigate('Legal')} />
        </View>
        <Text style={styles.note}>
          Wesoxch has no adverts and never sells your data. It does not record events. It only helps people attend.
        </Text>

        <Text style={styles.groupTitle}>Your data</Text>
        <View style={styles.group}>
          <Row icon="trash-outline" label="Delete my account" danger onPress={() => navigation.navigate('DeleteAccount')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 4 },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
  scroll: { padding: 16, paddingBottom: 48 },
  me: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  meName: { fontSize: 20, fontWeight: '600', color: colors.text },
  meHandle: { fontSize: 14, color: colors.muted },
  groupTitle: { fontSize: 12, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 24, marginBottom: 8 },
  group: { backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 56, paddingHorizontal: 16, paddingVertical: 8 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 16, color: colors.text },
  rowValue: { fontSize: 14, color: colors.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 54 },
  note: { fontSize: 14, color: colors.muted, lineHeight: 20, marginTop: 8 },
});
