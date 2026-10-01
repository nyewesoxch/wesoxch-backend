import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, Text } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import VerifyOTPScreen from './src/screens/VerifyOTPScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import MainTabs from './src/navigation/MainTabs';

const Stack = createNativeStackNavigator();

const Placeholder = ({ route }) => (
  <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: '#fff', fontSize: 18 }}>{route.name}</Text>
  </View>
);

// Temporary placeholder main screens
const PlaceholderScreen = (name) => () => (
  <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: '#fff', fontSize: 20 }}>{name} ✅</Text>
    <Text style={{ color: '#94A3B8', fontSize: 14, marginTop: 8 }}>Coming next!</Text>
  </View>
);

const PulseScreen = PlaceholderScreen('Pulse Feed');
const CommunitiesScreen = PlaceholderScreen('Communities');
const SearchScreen = PlaceholderScreen('Search');
const EventsScreen = PlaceholderScreen('Events');
const ProfileScreen = PlaceholderScreen('Profile');

function RootNavigator() {
  const { user, loading } = useAuth();
  const [onboarded, setOnboarded] = useState(null);

  useEffect(() => {
    SecureStore.getItemAsync('wesoxch_onboarded').then(val => setOnboarded(val === 'true'));
  }, []);

  if (loading || onboarded === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  if (!onboarded && !user) {
    return <OnboardingScreen onFinish={() => setOnboarded(true)} />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="CommunityChat" component={Placeholder} />
          <Stack.Screen name="CommunityMembers" component={Placeholder} />
          <Stack.Screen name="UserProfile" component={Placeholder} />
          <Stack.Screen name="CreateCommunity" component={Placeholder} />
          <Stack.Screen name="CreateEvent" component={Placeholder} />
          <Stack.Screen name="CreateListing" component={Placeholder} />
          <Stack.Screen name="Rentals" component={Placeholder} />
          <Stack.Screen name="CreateRental" component={Placeholder} />
          <Stack.Screen name="Therapy" component={Placeholder} />
          <Stack.Screen name="TherapyRoom" component={Placeholder} />
          <Stack.Screen name="BecomeSeller" component={Placeholder} />
          <Stack.Screen name="MyListings" component={Placeholder} />
          <Stack.Screen name="Legal" component={Placeholder} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
