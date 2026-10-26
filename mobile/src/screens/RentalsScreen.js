import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
export default function RentalsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
      <View style={styles.center}>
        <Text style={styles.title}>RentalsScreen</Text>
        <Text style={styles.sub}>Loading...</Text>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  back: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
});
