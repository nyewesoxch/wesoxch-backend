import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import VerifyOTPScreen from './src/screens/VerifyOTPScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import MainTabs from './src/navigation/MainTabs';
import CommunityChatScreen from './src/screens/CommunityChatScreen';
import CommunityMembersScreen from './src/screens/CommunityMembersScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import CreateCommunityScreen from './src/screens/CreateCommunityScreen';
import CreateEventScreen from './src/screens/CreateEventScreen';
import CreateListingScreen from './src/screens/CreateListingScreen';
import RentalsScreen from './src/screens/RentalsScreen';
import CreateRentalScreen from './src/screens/CreateRentalScreen';
import TherapyScreen from './src/screens/TherapyScreen';
import TherapyRoomScreen from './src/screens/TherapyRoomScreen';
import BecomeSellerScreen from './src/screens/BecomeSellerScreen';
import MyListingsScreen from './src/screens/MyListingsScreen';
import LegalScreen from './src/screens/LegalScreen';

const Stack = createNativeStackNavigator();

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
          <Stack.Screen name="CommunityChat" component={CommunityChatScreen} />
          <Stack.Screen name="CommunityMembers" component={CommunityMembersScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="CreateCommunity" component={CreateCommunityScreen} />
          <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
          <Stack.Screen name="CreateListing" component={CreateListingScreen} />
          <Stack.Screen name="Rentals" component={RentalsScreen} />
          <Stack.Screen name="CreateRental" component={CreateRentalScreen} />
          <Stack.Screen name="Therapy" component={TherapyScreen} />
          <Stack.Screen name="TherapyRoom" component={TherapyRoomScreen} />
          <Stack.Screen name="BecomeSeller" component={BecomeSellerScreen} />
          <Stack.Screen name="MyListings" component={MyListingsScreen} />
          <Stack.Screen name="Legal" component={LegalScreen} />
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
