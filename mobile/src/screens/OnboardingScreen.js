import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');
const SLIDES = [
  { id: '1', icon: '🌍', title: 'Welcome to Wesoxch', subtitle: 'Your community, your pulse.', desc: 'Real people. Real events. Real connections in your community.', color: '#22C55E' },
  { id: '2', icon: '📅', title: 'Discover Local Events', subtitle: "What's happening near you?", desc: 'Find sports, music, food, business events right in your neighbourhood.', color: '#7B4F2E' },
  { id: '3', icon: '👥', title: 'Join Communities', subtitle: 'Find your people.', desc: 'Join communities based on where you live or what you love.', color: '#3B82F6' },
  { id: '4', icon: '🏠', title: 'Find a Home', subtitle: 'Rentals near you.', desc: 'Find houses and apartments near you. Connect directly with landlords.', color: '#F59E0B' },
  { id: '5', icon: '💙', title: 'Our Therapy', subtitle: 'You are not alone.', desc: 'A safe anonymous space to talk, share and listen.', color: '#8B5CF6' },
  { id: '6', icon: '🛍️', title: 'Local Marketplace', subtitle: 'Buy and sell close to home.', desc: 'No middlemen. No commissions. Just real local trade.', color: '#22C55E' },
];

export default function OnboardingScreen({ onFinish }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(prev => prev + 1);
    } else {
      SecureStore.setItemAsync('wesoxch_onboarded', 'true').then(onFinish);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipBtn} onPress={() => SecureStore.setItemAsync('wesoxch_onboarded', 'true').then(onFinish)}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
      <FlatList ref={flatListRef} data={SLIDES} keyExtractor={item => item.id} horizontal pagingEnabled scrollEnabled={false} showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconCircle, { backgroundColor: item.color + '20', borderColor: item.color }]}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={[styles.subtitle, { color: item.color }]}>{item.subtitle}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        )}
      />
      <View style={styles.dots}>
        {SLIDES.map((_, i) => <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />)}
      </View>
      <TouchableOpacity style={[styles.nextBtn, { backgroundColor: SLIDES[currentIndex].color }]} onPress={handleNext}>
        <Text style={styles.nextBtnText}>{currentIndex === SLIDES.length - 1 ? 'Get Started 🚀' : 'Next'}</Text>
        {currentIndex < SLIDES.length - 1 && <Ionicons name="arrow-forward" size={18} color="#fff" />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  skipBtn: { position: 'absolute', top: 60, right: 24, zIndex: 10 },
  skipText: { color: '#64748B', fontSize: 14 },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 32, borderWidth: 2 },
  icon: { fontSize: 56 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  desc: { fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 24 },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#334155' },
  dotActive: { width: 24, backgroundColor: '#22C55E' },
  nextBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, marginBottom: 40 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
