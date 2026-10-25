import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../theme/colors';
export default function ProfileScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>ProfileScreen</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 6 }}>Loading...</Text>
    </View>
  );
}
