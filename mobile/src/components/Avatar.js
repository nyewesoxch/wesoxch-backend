import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '../theme/colors';
import { fileUrl } from '../api/client';

// One place that draws a person's picture.
// If they have no picture, or it cannot load, it shows their first letter instead.
export default function Avatar({ uri, name = '', size = 40 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [uri]);

  const src = fileUrl(uri);
  const letter = (String(name).trim().charAt(0) || '?').toUpperCase();
  const box = { width: size, height: size, borderRadius: size / 2 };

  if (src && !failed) {
    return (
      <Image
        source={{ uri: src }}
        style={[box, styles.photo]}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={src}
        transition={100}
        onError={() => setFailed(true)}
        accessibilityLabel={name ? `${name}'s picture` : 'Profile picture'}
      />
    );
  }

  return (
    <View style={[box, styles.letterBox]} accessibilityLabel={name ? `${name}, no picture` : 'No picture'}>
      <Text style={[styles.letter, { fontSize: Math.max(Math.round(size * 0.42), 11) }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { backgroundColor: colors.surface },
  letterBox: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  letter: { color: '#fff', fontWeight: '600' },
});
