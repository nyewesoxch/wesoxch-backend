import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1', icon: 'globe-outline', emoji: '🌍',
    title: 'Welcome to Wesoxch',
    subtitle: 'Your community, your pulse.',
    desc: 'Real people. Real events. Real connections in your community.',
    gradient: [colors.primary, colors.primaryDark],
    accent: colors.primaryLight,
  },
  {
    id: '2', icon: 'calendar-outline', emoji: '📅',
    title: 'Discover Events',
    subtitle: "What's happening near you?",
    desc: 'Sports, music, food, business — events right in your neighbourhood.',
    gradient: ['#059669', '#065F46'],
    accent: colors.green,
  },
  {
    id: '3', icon: 'people-outline', emoji: '👥',
    title: 'Join Communities',
    subtitle: 'Find your people.',
    desc: 'Join communities based on where you live or what you love.',
    gradient: ['#7C3AED', '#4C1D95'],
    accent: colors.purple,
  },
  {
    id: '4', icon: 'home-outline', emoji: '🏠',
    title: 'Find a Home',
    subtitle: 'Rentals near you.',
    desc: 'Connect directly with landlords. No agents. No hidden fees.',
    gradient: ['#D97706', '#92400E'],
    accent: colors.amber,
  },
  {
    id: '5', icon: 'cube-outline', emoji: '🚚',
    title: 'Carrier Deliveries',
    subtitle: 'Get it delivered.',
    desc: 'Book local drivers to deliver your marketplace purchases.',
    gradient: ['#2563EB', '#1E3A8A'],
    accent: colors.blue,
  },
  {
    id: '6', icon: 'heart-outline', emoji: '💙',
    title: 'Our Therapy',
    subtitle: 'You are not alone.',
    desc: 'A safe anonymous space to share and listen.',
    gradient: ['#7C3AED', '#2D1B69'],
    accent: colors.therapy,
  },
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

  const slide = SLIDES[currentIndex];

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      <View style={styles.emojiCircle}>
        <Text style={styles.emoji}>{item.emoji}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={[styles.subtitle, { color: item.accent }]}>{item.subtitle}</Text>
      <Text style={styles.desc}>{item.desc}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={slide.gradient} style={styles.gradient} />
      <TouchableOpacity style={styles.skipBtn} onPress={() => SecureStore.setItemAsync('wesoxch_onboarded', 'true').then(onFinish)}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal pagingEnabled scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        renderItem={renderSlide}
      />
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === currentIndex && { backgroundColor: '#fff', width: 24 }]} />
        ))}
      </View>
      <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
        <Text style={styles.nextBtnText}>
          {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
        </Text>
        <Ionicons name={currentIndex === SLIDES.length - 1 ? 'rocket-outline' : 'arrow-forward'} size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  gradient: { ...StyleSheet.absoluteFillObject, opacity: 0.15 },
  skipBtn: { position: 'absolute', top: 60, right: 24, zIndex: 10 },
  skipText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emojiCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  emoji: { fontSize: 56 },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  desc: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  nextBtn: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, marginBottom: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
